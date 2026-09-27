# HabiCapital · Reto técnico Practicantes 2027

Sistema de transferencias P2P con ledger de doble
entrada, construido para el reto técnico de HabiCapital.

## Stack

- **Backend:** FastAPI (Python 3.12)
- **Base de datos:** PostgreSQL, vía SQLModel/SQLAlchemy
- **Gestión de dependencias:** [uv](https://docs.astral.sh/uv/)
- **Frontend:** React + TypeScript + Vite, Tailwind CSS, shadcn/ui (Base UI),
  TanStack Query, React Router
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

### Opción 2 — desarrollo local (hot-reload)

**Backend:**

```bash
docker compose up -d db       # solo Postgres
cp .env.example .env
uv run alembic upgrade head   # crea el esquema (migraciones, no create_all)
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
  usalo — crear cuenta, cargar saldo, transferir, ver historial, crear un
  gasto grupal y saldar una parte.
- **API directa**: `http://localhost:8000/docs` tiene Swagger UI interactivo
  con todos los endpoints y sus schemas — se puede probar cada uno sin
  necesidad del frontend ni de Postman.
- **Reset a estado limpio**: `docker compose down -v && docker compose up -d`
  (con Docker) tira la base de datos y la vuelve a crear vacía.

## Cómo correr los tests automatizados

```bash
uv run pytest
```

Incluye tests de concurrencia real (hilos + conexiones independientes a
Postgres, no mockeado) para la protección contra condiciones de carrera,
deadlocks e idempotencia. Ver `tests/test_concurrency.py`.

## Endpoints principales

| Método | Ruta | Qué hace |
|---|---|---|
| `POST` | `/accounts` | Crear cuenta |
| `GET` | `/accounts` | Listar cuentas |
| `GET` | `/accounts/{id}` | Consultar cuenta (incluye saldo) |
| `GET` | `/accounts/{id}/movements` | Historial de movimientos |
| `POST` | `/movements/deposit` | Cargar saldo (simulado) — requiere header `Idempotency-Key` |
| `POST` | `/movements/transfer` | Transferir entre cuentas — requiere header `Idempotency-Key` |
| `GET` | `/tags` | Listar tags existentes |
| `POST` | `/expenses` | Crear un gasto grupal dividido entre cuentas |
| `GET` | `/expenses/{id}` | Ver un gasto y el estado de cada parte |
| `POST` | `/expenses/{id}/shares/{share_id}/settle` | Saldar una parte del gasto (genera una transferencia real) |

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
