# HabiCapital · Reto técnico Practicantes 2027

Billetera P2P para mover plata entre personas (enviar, cobrar y dividir
gastos) sobre un ledger de doble entrada, construida para el reto técnico de
HabiCapital. Incluye cuentas de usuario reales (correo + contraseña) y
autorización: nadie puede ver ni mover plata que no sea suya.

## Stack

- **Backend:** FastAPI (Python 3.12); auth con JWT en cookie httpOnly y
  contraseñas con argon2id
- **Base de datos:** PostgreSQL, vía SQLModel/SQLAlchemy
- **Gestión de dependencias:** [uv](https://docs.astral.sh/uv/)
- **Frontend:** React + TypeScript + Vite, Tailwind CSS, shadcn/ui (Base UI),
  TanStack Query, React Router
- **Tests:** pytest (backend, contra Postgres real) + Playwright (e2e)
- **Infraestructura:** Docker Compose (Postgres + backend + frontend)

## Cómo correrlo

### Opción 1 — todo con Docker (un solo comando)

```bash
docker compose up -d --build
```

Levanta Postgres, corre las migraciones de Alembic automáticamente al
arrancar el backend (`docker-entrypoint.sh`), y sirve el frontend ya
compilado con nginx.

- Frontend: **http://localhost:8080**
- Backend / docs interactivas: **http://localhost:8000** / **http://localhost:8000/docs**

Nginx sirve el frontend y hace proxy de `/api` al backend (mismo patrón que
el proxy del servidor de desarrollo — ver `frontend/nginx.conf`).

Para tener usuarios con historial listos para probar:

```bash
docker compose exec backend python -m app.seed          # agrega los usuarios demo
docker compose exec backend python -m app.seed --reset  # borra TODO y los recrea
```

Usuarios demo (contraseña `habicapital123`): `ana@demo.co`, `beto@demo.co`,
`carla@demo.co`. Ana tiene un cobro pendiente por pagar.

### Opción 2 — desarrollo local (hot-reload)

**Backend:**

```bash
docker compose up -d db       # solo Postgres
cp .env.example .env
uv run alembic upgrade head   # crea el esquema (migraciones, no create_all)
uv run python -m app.seed     # opcional: usuarios demo
uv run uvicorn app.main:app --reload
```

La API queda en `http://localhost:8000`.

**Frontend** (con el backend ya corriendo):

```bash
cd frontend
npm install
npm run dev
```

Queda en `http://localhost:5173`, con un proxy a `/api` →
`http://localhost:8000` (ver `frontend/vite.config.ts`) — no hace falta
configurar CORS ni variables de entorno para desarrollo local.

No corras la Opción 1 y la Opción 2 al mismo tiempo — ambas usan el puerto
8000 para el backend.

## Cómo probar manualmente

Con cualquiera de las dos opciones arriba corriendo:

- **UI completa**: abrí el frontend (`:8080` con Docker, `:5173` en dev) y
  usalo — crear cuenta (o entrar con un usuario demo), cargar saldo, enviar,
  ver historial, dividir un gasto, cobrar y pagar una parte.
- **API directa**: `http://localhost:8000/docs` tiene Swagger UI interactivo
  con todos los endpoints y sus schemas — se puede probar cada uno sin
  necesidad del frontend ni de Postman.
- **Reset a estado limpio**: `docker compose down -v && docker compose up -d`
  (con Docker) tira la base de datos y la vuelve a crear vacía.

## Cómo correr los tests automatizados

**Backend** (necesita Postgres corriendo: `docker compose up -d db`):

```bash
uv run pytest
```

Incluye tests de concurrencia real (hilos + conexiones independientes a
Postgres, no mockeado) para la protección contra condiciones de carrera,
deadlocks e idempotencia (`tests/test_concurrency.py`), y tests de
autorización: nadie puede mover, ver ni pagar plata ajena
(`tests/test_authorization.py`).

**End-to-end** (necesita el backend corriendo en `:8000`; levanta Vite solo
si no está corriendo):

```bash
cd frontend
npx playwright install chromium   # solo la primera vez
npm run test:e2e
# o contra el stack de Docker:
E2E_BASE_URL=http://localhost:8080 npm run test:e2e
```

Registra dos usuarios nuevos desde la UI, carga saldo, transfiere (pasando
por la confirmación) y verifica el saldo e historial de ambos lados.

## Endpoints principales

Todo lo que no es `/auth/register`, `/auth/login` o `/auth/session` requiere
sesión (cookie). La cuenta de origen de cualquier movimiento sale siempre de
la sesión, nunca del body.

| Método | Ruta | Qué hace |
|---|---|---|
| `POST` | `/auth/register` | Crear usuario + su cuenta (inicia sesión) |
| `POST` | `/auth/login` · `/auth/logout` | Iniciar / cerrar sesión |
| `GET` | `/auth/session` | Quién está logueado (`user: null` si nadie) |
| `GET` · `PATCH` | `/auth/me` | Ver / editar nombre y correo |
| `POST` | `/auth/me/password` | Cambiar contraseña |
| `GET` | `/me/account` | Mi cuenta y saldo |
| `GET` | `/me/movements` | Mi historial (con contraparte y dirección) |
| `GET` | `/users/search?q=` | Buscar personas (nunca devuelve saldos) |
| `POST` | `/movements/deposit` | Cargar saldo (simulado) — header `Idempotency-Key` |
| `POST` | `/movements/transfer` | Enviar plata desde mi cuenta — header `Idempotency-Key` |
| `GET` | `/tags` | Mis etiquetas |
| `POST` | `/expenses` | Dividir un gasto que pagué (o cobrarle a alguien) |
| `GET` | `/expenses` · `/expenses/{id}` | Gastos en los que participo |
| `POST` | `/expenses/{id}/shares/{share_id}/settle` | Pagar mi parte (genera una transferencia real) |

Los errores responden `{"detail": "<mensaje en español>", "code": "<código estable>"}`.

Docs interactivas con todos los schemas en `/docs`.

## Respuestas del reto

> Pendiente — se completa a medida que avanza la implementación.

1. **Decisiones clave y por qué las tomé:**
2. **Cómo sé que el sistema no pierde un peso** (qué puede salir mal, cómo lo
   protejo, qué evidencia tengo):
3. **Qué dejé fuera y por qué:**
4. **Qué haría distinto con más tiempo:**
5. **Qué NO sé:**
6. **Supuestos que hice y por qué:**
7. **Cómo usé IA** (herramientas, dinámica, un caso en que se equivocó):
8. **Qué aprendí:**
