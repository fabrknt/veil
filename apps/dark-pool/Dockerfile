FROM node:20-slim AS base

RUN corepack enable && corepack prepare pnpm@10.31.0 --activate
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy workspace root
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Copy only the packages needed by dark-pool
COPY packages/core/package.json packages/core/
COPY packages/orders/package.json packages/orders/
COPY apps/dark-pool/package.json apps/dark-pool/

# Install deps
RUN pnpm install --frozen-lockfile

# Copy source
COPY packages/core/ packages/core/
COPY packages/orders/ packages/orders/
COPY apps/dark-pool/solver/ apps/dark-pool/solver/
COPY apps/dark-pool/sdk/ apps/dark-pool/sdk/
COPY apps/dark-pool/tsconfig.json apps/dark-pool/

# Build workspace packages
RUN cd packages/core && pnpm run build
RUN cd packages/orders && pnpm run build

# Rebuild native modules (better-sqlite3)
RUN cd apps/dark-pool && pnpm rebuild better-sqlite3

WORKDIR /app/apps/dark-pool

EXPOSE 3040

# Data directory for SQLite
RUN mkdir -p /data
ENV SOLVER_DB_PATH=/data/dark-pool-solver.db

CMD ["node", "--experimental-strip-types", "solver/src/index.ts"]
