# Use a lightweight Node image
FROM node:18-alpine

# Create app directory
WORKDIR /app

# Copy package files first for caching
COPY package*.json npm.lock* ./

# Install dependencies
RUN npm install --production=false

# Copy the rest of the code
COPY . .

# Build TypeScript into dist/
RUN npm run build


# Expose the port your app runs on
EXPOSE 3000

# Command to run the server
CMD ["node", "dist/index.js"]
