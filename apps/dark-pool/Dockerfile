FROM node:22-slim AS base

RUN npm config set strict-ssl false && \
    npm install -g pnpm@10.31.0 && \
    npm config set strict-ssl true
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy workspace root + all source up front (packages/core has a `prepare` script
# that runs tsc during pnpm install, so source must be present before install).
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.json ./
COPY packages/core/ packages/core/
COPY packages/orders/ packages/orders/
COPY apps/dark-pool/package.json apps/dark-pool/tsconfig.json apps/dark-pool/
COPY apps/dark-pool/solver/ apps/dark-pool/solver/
COPY apps/dark-pool/sdk/ apps/dark-pool/sdk/

# Install deps (strict-ssl off in case the build env has a TLS-intercepting proxy)
RUN pnpm config set strict-ssl false && \
    pnpm install --frozen-lockfile && \
    pnpm config set strict-ssl true

# Build workspace packages
RUN cd packages/orders && pnpm run build

# Build better-sqlite3 from source against this image's Node ABI (prebuilt downloads
# don't always cover the latest Node releases).
RUN cd /app/node_modules/.pnpm/better-sqlite3@11.10.0/node_modules/better-sqlite3 && \
    npm run build-release

# Compile solver TypeScript to CommonJS JS so Node ESM resolution doesn't choke
# on extensionless relative imports.
WORKDIR /app/apps/dark-pool
RUN pnpm exec tsc \
  --module commonjs --target es2020 --esModuleInterop --skipLibCheck --resolveJsonModule \
  --outDir dist-solver --rootDir solver \
  solver/src/index.ts

EXPOSE 3040

RUN mkdir -p /data
ENV SOLVER_DB_PATH=/data/dark-pool-solver.db

CMD ["node", "dist-solver/src/index.js"]
