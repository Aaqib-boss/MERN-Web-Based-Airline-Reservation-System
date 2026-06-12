FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./

# Install dependencies (only production)
RUN npm ci --only=production

# Copy remaining source code
COPY . .

# Expose backend port
EXPOSE 5002

# Run application
CMD ["node", "server.js"]
