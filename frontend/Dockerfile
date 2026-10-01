# ApexPay Global - Frontend
# --- Stage 1: build static assets ---
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# --- Stage 2: serve with unprivileged Nginx ---
# nginxinc/nginx-unprivileged already runs the master/worker processes
# as a non-root user, so no additional user setup is required here.
FROM nginxinc/nginx-unprivileged:1.27-alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
