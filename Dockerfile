# Production Dockerfile for UDRG Membership Management System
# Optimized multi-stage build to minimize final image size

# Build stage
FROM node:20-alpine AS builder

# Install only essential system dependencies for building
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    musl-dev \
    giflib-dev \
    pixman-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    freetype-dev

# Set working directory
WORKDIR /app

# Copy package files first for better Docker layer caching
COPY package*.json ./

# Install all dependencies for build (cleaned up later)
RUN npm ci --include=dev --frozen-lockfile && \
    npm cache clean --force

# Copy only necessary source files (excluding large assets via .dockerignore)
COPY client ./client
COPY server ./server
COPY shared ./shared
COPY vite.config.ts ./
COPY tsconfig.json ./
COPY tailwind.config.ts ./
COPY postcss.config.js ./
COPY theme.json ./

# Build the application with production optimizations
RUN NODE_ENV=production npm run build && \
    # Clean up build dependencies and cache
    rm -rf node_modules && \
    rm -rf .cache .vite /tmp/* /var/cache/apk/*

# Production stage - Ultra-lightweight runtime
FROM node:20-alpine AS production

# Set production environment variables
ENV NODE_ENV=production
ENV PORT=5000
ENV NPM_CONFIG_LOGLEVEL=warn

# Set working directory
WORKDIR /app

# Install only essential runtime system dependencies
RUN apk add --no-cache \
    cairo \
    jpeg \
    pango \
    giflib \
    pixman \
    libjpeg-turbo \
    freetype \
    curl \
    dumb-init && \
    # Clean up package cache immediately
    rm -rf /var/cache/apk/*

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S appuser -u 1001 -G nodejs

# Copy package files for production dependencies only
COPY package*.json ./

# Install only production dependencies with optimizations
RUN npm ci --only=production --frozen-lockfile --no-audit --no-fund && \
    npm cache clean --force && \
    rm -rf ~/.npm /tmp/* /var/tmp/* && \
    # Remove unnecessary files from node_modules
    find node_modules -name "*.md" -delete && \
    find node_modules -name "*.txt" -delete && \
    find node_modules -name "test" -type d -exec rm -rf {} + 2>/dev/null || true && \
    find node_modules -name "tests" -type d -exec rm -rf {} + 2>/dev/null || true && \
    find node_modules -name "example*" -type d -exec rm -rf {} + 2>/dev/null || true

# Copy built application from builder stage
COPY --from=builder --chown=appuser:nodejs /app/dist ./dist

# Create uploads directory with proper permissions
RUN mkdir -p uploads tmp && \
    chown -R appuser:nodejs uploads tmp dist

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 5000

# Optimized health check with reduced overhead
HEALTHCHECK --interval=45s --timeout=5s --start-period=30s --retries=2 \
    CMD curl -f http://localhost:5000/api/health || exit 1

# Use dumb-init to handle signals properly and start application
CMD ["dumb-init", "node", "dist/index.js"]