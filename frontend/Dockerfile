# Build stage: compile the SPA.
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Runtime stage: nginx serving the static build, proxying /api to the
# backend container by its Compose service name — mirrors exactly how the
# Vite dev server's proxy works, so the app talks to the same relative
# /api path in both environments and never needs a build-time API URL.
FROM nginx:alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
