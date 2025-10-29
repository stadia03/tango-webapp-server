# Use Node 18 (LTS)
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy only package files first
COPY package*.json ./

# Install dependencies (including dev ones for build)
RUN npm install

# Copy all source files
COPY . .

# Build TypeScript into dist/
RUN npm run build

# Expose port
EXPOSE 3000

# Start server
CMD ["npm", "start"]
