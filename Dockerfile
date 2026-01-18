FROM node:18-alpine

WORKDIR /app

COPY backend/package.json backend/package-lock.json* ./backend/
RUN cd backend && npm install --production || true

COPY backend ./backend

WORKDIR /app/backend
EXPOSE 3000
CMD ["node", "src/server.js"]

