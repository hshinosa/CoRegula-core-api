# syntax=docker/dockerfile:1.6
FROM node:20-alpine AS base
WORKDIR /app

RUN apk add --no-cache python3 make g++ openssl

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

FROM node:20-alpine AS production
ENV NODE_ENV=production
WORKDIR /app

RUN apk add --no-cache openssl

COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/dist ./dist
COPY package*.json ./
COPY prisma ./prisma

EXPOSE 3000

CMD ["node", "dist/server.js"]
