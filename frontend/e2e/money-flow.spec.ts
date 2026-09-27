import { expect, test, type Page } from '@playwright/test'

// Fresh users on every run, so the test never depends on seed data or on
// what a previous run left behind.
const run = Date.now()
const sender = { name: 'Sofía Prueba', email: `sofia.${run}@example.com`, password: 'clave-segura-1' }
const receiver = { name: 'Tomás Prueba', email: `tomas.${run}@example.com`, password: 'clave-segura-1' }

// Intl's es-CO currency format uses a non-breaking space after "$".
const money = (text: string) => new RegExp(text.replace('$ ', '\\$\\s').replace(/\./g, '\\.'))

async function register(page: Page, user: typeof sender) {
  await page.goto('/registro')
  await page.getByLabel('Nombre').fill(user.name)
  await page.getByLabel('Correo').fill(user.email)
  await page.getByLabel('Contraseña', { exact: true }).fill(user.password)
  await page.getByRole('button', { name: 'Crear cuenta' }).click()
  await expect(page).toHaveURL(/\/inicio$/)
}

async function logout(page: Page) {
  await page.getByRole('button', { name: 'Menú de tu cuenta' }).click()
  await page.getByRole('menuitem', { name: 'Cerrar sesión' }).click()
  await expect(page).toHaveURL(/\/$/)
}

const balance = (page: Page) => page.getByLabel('Tu saldo').locator('p.amount')

test('protected pages send signed-out visitors to login', async ({ page }) => {
  await page.goto('/historial')
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: 'Bienvenido de nuevo' })).toBeVisible()
})

test('register, load balance, send money and see it on both sides', async ({ page }) => {
  await register(page, receiver)
  await logout(page)

  await register(page, sender)
  await expect(balance(page)).toHaveText(money('$ 0'))

  // Load balance (simulated deposit)
  await page.getByRole('button', { name: 'Cargar saldo' }).first().click()
  await page.getByRole('dialog').getByPlaceholder('0').fill('100000')
  await page.getByRole('button', { name: /^Cargar \$/ }).click()
  await expect(balance(page)).toHaveText(money('$ 100.000'))

  // Sending more than the balance is stopped before reaching the backend
  await page.getByRole('button', { name: 'Enviar', exact: true }).click()
  // By the unique email: earlier runs leave other "Tomás Prueba" users behind.
  await page.getByPlaceholder('Busca por nombre o correo').fill(receiver.email)
  await page.getByRole('option', { name: new RegExp(receiver.email) }).click()
  await page.getByRole('dialog').getByPlaceholder('0').fill('150000')
  await page.getByRole('button', { name: 'Continuar' }).click()
  await expect(page.getByRole('dialog')).toContainText('Tu saldo disponible es')

  // Valid transfer, through the confirmation step
  await page.getByRole('dialog').getByPlaceholder('0').fill('35000')
  await page.getByPlaceholder('Ej. Mercado de la semana').fill('Arriendo de octubre')
  await page.getByRole('button', { name: 'Continuar' }).click()
  await expect(page.getByRole('dialog')).toContainText('Confirma el envío')
  await page.getByRole('button', { name: /^Enviar \$/ }).click()

  await expect(balance(page)).toHaveText(money('$ 65.000'))
  await expect(page.getByText(`Enviaste a ${receiver.name}`)).toBeVisible()

  // The receiver sees the money and its context
  await logout(page)
  await page.goto('/login')
  await page.getByLabel('Correo').fill(receiver.email)
  await page.getByLabel('Contraseña', { exact: true }).fill(receiver.password)
  await page.getByRole('button', { name: 'Iniciar sesión' }).click()
  await expect(balance(page)).toHaveText(money('$ 35.000'))
  await expect(page.getByText(`${sender.name} te envió`)).toBeVisible()
  await expect(page.getByText(/Arriendo de octubre/)).toBeVisible()
})
