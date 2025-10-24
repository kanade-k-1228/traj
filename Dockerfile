# ---------------------------------------------------------
# Stage 1: Node dependencies cache
FROM node:24-slim AS deps
WORKDIR /app/web

# Install pnpm
RUN npm install -g pnpm

# Copy package files for dependency installation
COPY ./web/package.json ./web/pnpm-lock.yaml ./

# Install dependencies (cached when package files don't change)
RUN CI=1 pnpm i --frozen-lockfile --prefer-offline

# ---------------------------------------------------------
# Stage 2: Build React App
FROM deps AS builder
WORKDIR /app/web

# Copy source code
COPY ./web ./

# Build the application
RUN pnpm build

# ---------------------------------------------------------
# Stage 3: Production runtime with Caddy
FROM caddy:2-alpine AS runtime

# Copy built static files from builder
COPY --from=builder /app/web/dist /srv

# Create Caddyfile for serving SPA
RUN echo ':8000 { \n\
    root * /srv \n\
    encode gzip \n\
    try_files {path} /index.html \n\
    file_server \n\
    }' > /etc/caddy/Caddyfile

EXPOSE 8000

# Run Caddy
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
