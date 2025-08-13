# syntax=docker/dockerfile:1
# Stage 1: Base image.
## Start with a base image containing NodeJS so we can build .
FROM node:lts AS base
## Disable colour output from yarn to make logs easier to read.
ENV FORCE_COLOR=0
## Enable corepack.
RUN corepack enable
## Set the working directory to `/opt/auditmapper`.
WORKDIR /opt/auditmapper

# Stage 2a: Development mode.
FROM base AS dev
## Set the working directory to `/opt/auditmapper`.
WORKDIR /opt/auditmapper
## Enable polling for file watching in Docker
ENV VITE_USE_POLLING=true
ENV VITE_POLL_INTERVAL=1000
## Expose the port that will run on.
EXPOSE 3000
## Run the development server.
CMD [ -d "node_modules" ] && npm run dev -- --host 0.0.0.0 || npm install && npm run dev -- --host 0.0.0.0

# Stage 2b: Production build mode.
FROM base AS prod
## Set the working directory to `/opt/auditmapper`.
WORKDIR /opt/auditmapper
## Copy over the source code.
COPY . /opt/auditmapper/
## Install dependencies with `--immutable` to ensure reproducibility.
RUN npm ci
## Build the static site.
RUN npm run build

# Stage 3a: Serve with ` serve`.
FROM prod AS serve
## Expose the port that will run on.
EXPOSE 3000
## Run the production server.
CMD ["npm", "run", "serve", "--", "--host", "0.0.0.0", "--no-open"]

# Stage 3b: Serve with Caddy.
FROM caddy:2-alpine AS caddy
## Copy the Caddyfile.
COPY --from=prod /opt/auditmapper/Caddyfile /etc/caddy/Caddyfile
## Copy the build output.
COPY --from=prod /opt/auditmapper/build /var/auditmapper