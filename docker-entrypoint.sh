#!/bin/sh
set -e

# Migrations are the source of truth for the schema (see decisions.md,
# "Alembic en vez de create_all") — run them before the app can serve
# traffic, and fail loudly (set -e) if they don't succeed instead of
# starting an app pointed at a schema it doesn't match.
alembic upgrade head

exec uvicorn app.main:app --host 0.0.0.0 --port 8000
