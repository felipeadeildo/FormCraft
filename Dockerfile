FROM oven/bun:1-alpine AS development-dependencies-env
COPY . /app
WORKDIR /app
RUN bun install

FROM oven/bun:1-alpine AS build-env
COPY . /app/
COPY --from=development-dependencies-env /app/node_modules /app/node_modules
WORKDIR /app
RUN bun run build

FROM oven/bun:1-alpine
COPY ./package.json bun.lockb /app/
WORKDIR /app
RUN bun install --production
COPY --from=build-env /app/build /app/build
CMD ["bun", "run", "start"]