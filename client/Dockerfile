# Build stage
FROM node:18-alpine AS build
WORKDIR /app

# Copy package files first
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy client source code
COPY . .

# Build Vite static assets
RUN npm run build

# Production stage using Nginx
FROM nginx:alpine

# Copy built static files from build stage to Nginx directory
COPY --from=build /app/dist /usr/share/nginx/html

# Copy Nginx server configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose web container port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
