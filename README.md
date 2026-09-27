# HabiCapital · Reto técnico Practicantes 2027

Sistema de transferencias P2P (tipo "billetera entre amigos") con ledger de doble
entrada, construido para el reto técnico de HabiCapital.

## Stack

- **Backend:** FastAPI (Python 3.12)
- **Base de datos:** PostgreSQL, vía SQLModel/SQLAlchemy
- **Gestión de dependencias:** [uv](https://docs.astral.sh/uv/)
- **Infraestructura local:** Docker Compose (solo el contenedor de Postgres)

## Cómo correrlo

```bash
docker compose up -d          # levanta Postgres
cp .env.example .env
uv run uvicorn app.main:app --reload
```

La API queda en `http://localhost:8000`. Docs interactivas en
`http://localhost:8000/docs`.

## Cómo correr los tests

```bash
uv run pytest
```

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
