# HabiCapital · Reto técnico Practicantes 2027

Billetera P2P para mover plata entre personas (enviar, cobrar y dividir
gastos) sobre un ledger de doble entrada, construida para el reto técnico de
HabiCapital. Incluye cuentas de usuario reales (correo + contraseña) y
autorización.

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

### Opción 1, todo con Docker (un solo comando)

```bash
docker compose up -d --build
```

Levantar Postgres, correr las migraciones de Alembic automáticamente al
arrancar el backend (`docker-entrypoint.sh`), y sirve el frontend ya
compilado con nginx.

- Frontend: **http://localhost:8080**
- Backend / docs interactivas: **http://localhost:8000** / **http://localhost:8000/docs**

Nginx sirve el frontend y hace proxy de `/api` al backend (mismo patrón que
el proxy del servidor de desarrollo, ver `frontend/nginx.conf`).

Para tener usuarios con historial listos para probar:

```bash
docker compose exec backend python -m app.seed          # agrega los usuarios demo
docker compose exec backend python -m app.seed --reset  # borra TODO y los recrea
```

Usuarios demo (contraseña `habicapital123`): `ana@demo.co`, `beto@demo.co`,
`carla@demo.co`. Ana tiene un cobro pendiente por pagar.

### Opción 2, desarrollo local (hot-reload)

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
`http://localhost:8000` (ver `frontend/vite.config.ts`). No hace falta
configurar CORS ni variables de entorno para desarrollo local.

Nota: No correr la Opción 1 y la Opción 2 al mismo tiempo, ambas usan el puerto
8000 para el backend.

## Cómo probar manualmente

Con cualquiera de las dos opciones arriba corriendo:

- **UI completa**: abrí el frontend (`:8080` con Docker, `:5173` en dev) y
  usalo, crear cuenta (o entrar con un usuario demo), cargar saldo, enviar,
  ver historial, dividir un gasto, cobrar y pagar una parte.
- **API directa**: `http://localhost:8000/docs` tiene Swagger UI interactivo
  con todos los endpoints y sus schemas, se puede probar cada uno sin
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

**End-to-end** (necesita el backend corriendo en `:8000`; levantar Vite solo
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
| `POST` | `/movements/deposit` | Cargar saldo (simulado), header `Idempotency-Key` |
| `POST` | `/movements/transfer` | Enviar plata desde mi cuenta, header `Idempotency-Key` |
| `GET` | `/tags` | Mis etiquetas |
| `POST` | `/expenses` | Dividir un gasto que pagué (o cobrarle a alguien) |
| `GET` | `/expenses` · `/expenses/{id}` | Gastos en los que participo |
| `POST` | `/expenses/{id}/shares/{share_id}/settle` | Pagar mi parte (genera una transferencia real) |

Los errores responden `{"detail": "<mensaje en español>", "code": "<código estable>"}`.

Docs interactivas con todos los schemas en `/docs`.

## Respuestas del reto

1. **Decisiones clave y por qué las tomé**

   Uso FastAPI con SQLModel sobre PostgreSQL, y `uv` para manejar el
   proyecto. Elegí FastAPI porque valida los tipos con Pydantic, y eso
   importa cuando lo que manejas es plata. Además no esconde tanta magia
   como Django, prefiero un framework donde entienda bien qué está pasando
   en cada parte. Y Postgres en vez de SQLite porque necesitaba bloqueos
   reales de fila (`SELECT ... FOR UPDATE`), para que dos transferencias al
   mismo tiempo no pisen el mismo saldo. SQLite no me daba esa garantía.

   La decisión más importante fue usar un ledger de doble entrada. El
   campo `balance` de una cuenta es solo un número guardado para leer
   rápido, pero la verdad de cuánta plata tiene cada quien vive en
   `LedgerEntry`, una tabla que nunca se edita ni se borra. Cada
   movimiento (depósito o transferencia) crea dos entradas, un débito y un
   crédito, que siempre suman cero. Hasta los depósitos pasan por esto,
   hay una cuenta especial llamada `external` que representa "afuera del
   sistema", así que cargar saldo también es una transferencia (de
   `external` a tu cuenta), no plata que aparece de la nada. Con eso puedo
   probar que nunca se pierde un peso sumando toda la tabla, no solo
   confiando en que el código esté bien escrito.

   Encima de eso metí autenticación real (usuario, correo, contraseña,
   sesión con cookie). Sin eso, cualquiera que supiera el id de una cuenta
   podía moverle la plata a otra persona, y eso simplemente no podía ser.
   La cuenta desde la que sale la plata siempre se saca de la sesión del
   usuario, nunca de lo que manda el navegador.

   Como feature extra hice dividir gastos grupales (con etiquetas). Pensé
   en pagos recurrentes y en poder "pedir plata", pero las descarté porque
   cada una necesitaba su propio manejo de estados y terminaba siendo tres
   cosas a medias en vez de una bien hecha. Dividir un gasto, por dentro,
   usa el mismo mecanismo de transferencia.

2. **Cómo sé que el sistema no pierde un peso**

   La protección de verdad está en la base de datos, no solo en el código
   Python. Antes de leer o tocar el saldo de una cuenta la bloqueo con
   `SELECT ... FOR UPDATE` dentro de una transacción. Y siempre bloqueo
   las cuentas en el mismo orden (por id), nunca en el orden que venga en
   la request, porque si no, dos transferencias cruzadas entre las mismas
   dos cuentas se pueden trabar esperándose la una a la otra. Además,
   Postgres tiene un `CHECK` que rechaza cualquier saldo negativo, por si
   algo se me escapa en el código.

   Y no me quedé con el "debería funcionar", lo probé con concurrencia
   de verdad. Tengo un test que dispara 20 transferencias al mismo tiempo,
   cada una con su propia conexión a Postgres, contra un saldo que solo
   alcanza para 10. Terminan exactamente 10 exitosas y la cuenta nunca
   queda en negativo. Otro test hace 8 intentos concurrentes con la misma
   llave de idempotencia y confirma que solo se ejecuta un movimiento. Y en
   cada test que mueve plata reviso que la suma de toda la tabla de
   movimientos siga dando cero.

   También me protejo de reintentos duplicados. Cada depósito o
   transferencia necesita una llave de idempotencia (`Idempotency-Key`).
   Si el mismo intento llega dos veces, la segunda vez devuelvo lo que ya
   existía en vez de mover la plata otra vez. Y si alguien reusa esa llave
   para una operación distinta (otro monto, por ejemplo), lo rechazo en
   vez de devolver el movimiento viejo como si nada, porque eso haría
   pensar que la operación nueva sí pasó.

   Y del lado de quién puede hacer qué, nadie puede transferir desde una
   cuenta que no es suya, nadie puede pagar la parte de un gasto de otra
   persona, y no hay ningún endpoint que te deje ver el saldo o el
   historial de alguien más. Todo esto tiene su test en
   `tests/test_authorization.py`. El detalle completo, riesgo por riesgo,
   está en `.dev-notes/money-safety.md`.

   Lo que me falta probar es una falla real a mitad de un `commit` (el caso
   de fondos insuficientes sí está cubierto, pero no simulé una caída
   justo en medio de la escritura). El diseño ya lo protege con rollback
   automático, pero no tengo un test que fuerce ese escenario específico.

3. **Qué dejé fuera y por qué**

   - **Pagos recurrentes:** necesitan algo que corra solo cada cierto
     tiempo (un cron o worker), y eso no le suma nada a la parte de "no
     perder plata", que es lo que más pesa. Queda pendiente.
   - **Recuperar contraseña, verificar correo, login con Google, etc:** no
     lo hice porque esto es sobre mover plata, no sobre armar todo un
     sistema de cuentas de usuario. No tenía que ver con que la plata
     quede segura, así que no era prioridad.
   - **Pasarela de pago real:** cargar saldo es simulado, no se conecta a
     ningún banco de verdad.
   - **Modo oscuro:** el tema ya está definido en el CSS pero no puse un
     botón para cambiarlo, no era necesario y no valía la pena el tiempo.
   - **Paginación del historial:** hoy trae todos los movimientos de una.
     A la escala de una demo no importa, con muchísimos movimientos por
     usuario tocaría paginar.

4. **Qué haría distinto con más tiempo**

   - **Poder cerrar sesión de verdad en todos lados.** Hoy la sesión es un
     token que no depende de nada guardado en la base, así que cerrar
     sesión borra la cookie de tu navegador, pero si alguien roba el
     token sigue funcionando hasta que expire (12 horas), y cambiar la
     contraseña no cierra sesiones abiertas en otro dispositivo. Con más
     tiempo guardaría algo en la base para poder invalidar sesiones de
     verdad.
   - **Un test que simule el doble clic en "Enviar" desde la interfaz.**
     La protección existe (el botón se desactiva mientras procesa, y la
     llave de idempotencia no cambia entre reintentos), pero no
     automaticé esa prueba específica en el frontend, el backend sí está
     probado bajo concurrencia real.
   - El test de la falla a mitad de transacción que mencioné en el punto 2.
   - Probablemente pagos recurrentes sería lo siguiente, ahora que el
     resto ya está sólido.

5. **Qué NO sé**

   - No sé qué tan bien aguanta este diseño de bloqueos con muchísima más
     concurrencia (miles de transferencias por segundo, no decenas). Lo
     probé lo suficiente para demostrar que funciona, pero no le hice
     pruebas de carga real.
   - Nunca he operado un sistema así en producción, así que seguro hay
     formas de que falle con tráfico real que no anticipé.
   - No estoy seguro de que usar un JWT sin estado en una cookie sea la
     mejor forma de manejar sesiones a largo plazo, comparado con guardar
     sesiones en la base. Lo elegí porque era la tecnología que más conocía y a partir del tiempo que tenía, sabiendo el problema de revocación que mencioné
     arriba.
   - No investigué a fondo qué tan madura es Base UI (la base de la
     versión actual de shadcn/ui) comparada con Radix. Me topé con al
     menos una diferencia de comportamiento que tuve que resolver sobre la
     marcha.

6. **Supuestos que hice y por qué**

   - El sistema es cerrado, todas las cuentas reales son de HabiCapital.
     La cuenta `external` representa cualquier entrada de plata de
     afuera, como si fuera una pasarela de pago simulada.
   - Una sola moneda, pesos colombianos, sin conversión.
   - Los montos siempre son números enteros (centavos por dentro, pesos en
     la pantalla), nunca decimales sueltos, para no arriesgarme a errores
     de redondeo.
   - El correo identifica a cada persona, sin importar mayúsculas o
     minúsculas. Es el supuesto normal para este tipo de sistemas.
   - Asumí que ver quién le debe a quién es más útil que automatizar pagos
     recurrentes, porque los casos típicos (la cena, los roommates, la
     profesora, los freelancers) son básicamente "alguien pagó y hay que
     repartir", no algo que se repite solo cada mes.

7. **Cómo usé IA**

   Usé Claude Code todo el tiempo, de forma conversacional. Primero
   hablábamos de las decisiones (por qué Postgres, por qué el ledger de
   doble entrada, qué feature construir), y solo después de que yo decidía
   se escribía el código. Qué construir y qué no siempre lo decidí yo.

   El caso más grave en el que se equivocó fue justo en la parte más
   importante, la función que mueve la plata. Escribió algo que parecía
   correcto, primero una lectura rápida para revisar que la cuenta
   existiera, y luego, ya en la parte que sí bloqueaba la fila, otra
   lectura con `FOR UPDATE`. Compilaba, pasaba el linter, y hasta un test
   manual con curl funcionaba bien. El problema apareció cuando insistí en
   hacer el test de concurrencia real que tenía planeado desde el inicio,
   disparando 20 transferencias en paralelo contra un saldo que alcanzaba
   para 10, y las 20 "funcionaron". La causa era que en SQLAlchemy, si ya
   cargaste un objeto una vez en la sesión, una segunda consulta a la misma
   fila sí toma el bloqueo en Postgres, pero no actualiza los datos que ya
   tenías en memoria en Python. El bloqueo funcionaba en la base de datos,
   pero el código seguía usando el saldo viejo y no protegía nada en la
   práctica. Lo arreglamos quitando esa primera lectura sin bloqueo, ahora
   solo hay un lugar donde se cargan las cuentas, y siempre es bajo bloqueo.

   Ese susto me dejó una regla que seguí el resto del proyecto. Que algo
   compile y pase el linter no es evidencia de que funcione. Me pasó lo
   mismo en el frontend, con tres bugs reales que solo aparecieron
   probando la app de verdad en el navegador, nunca revisando el código a
   simple vista.

   También la IA me ayudó a encontrar cosas que se me habían pasado.
   Cuando agregué autenticación, notó que las llaves de idempotencia eran
   globales, así que un usuario podía reusar la llave de otro por
   accidente y recibir su movimiento en vez del suyo. Yo decidí cómo
   arreglarlo (separarlas por cuenta) y pedí que quedara con su propio
   test. Y en un momento en que le pedí explícitamente que nunca tocara
   mis commits ni el staging de git, terminó dejando un archivo marcado
   para borrar al hacer un renombre. Se dio cuenta ella misma revisando el
   estado de git, lo revirtió sin perder nada, y ajustamos la instrucción
   para que quedara más clara.

8. **Qué aprendí**

   Lo más nuevo para mí fue diseñar un ledger de doble entrada desde cero.
   Entendí por qué modelar la plata así, en vez de un simple número que
   sube y baja, es lo que de verdad te deja probar que no se pierde nada,
   en lugar de solo confiar en que el código quedó bien escrito.

   Lo que más me sorprendió fue el bug de concurrencia. Aprendí que un
   bloqueo de base de datos que "funciona" en una prueba manual puede no
   estar protegiendo nada de verdad si en algún punto anterior ya cargaste
   ese mismo dato sin bloquearlo. Es un tipo de error que no se ve a
   simple vista, solo lo agarra un test que genere la condición de carrera
   de verdad.

   Y sobre todo me llevo esto: verificar de verdad (tests de concurrencia
   reales, probar cada pantalla en un navegador real) importa mucho más
   que qué tan bonito se vea el código a primera vista. La IA aceleró un
   montón el trabajo, pero no reemplazó esa disciplina. De hecho, en el bug
   más importante del proyecto fue justo ella la que se equivocó, y fue esa
   misma disciplina la que lo atrapó antes de que llegara hasta acá.
