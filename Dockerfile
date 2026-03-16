# Base image dengan Node + Chromium (untuk puppeteer)
FROM node:20-slim

# Install dependencies Chromium
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-freefont-ttf \
    fonts-ipafont-gothic \
    fonts-wqy-zenhei \
    fonts-thai-tlwg \
    fonts-kacst \
    --no-install-recommends \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set Puppeteer agar pakai Chromium sistem (bukan download sendiri)
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy source
COPY src/ ./src/
COPY .env* ./

# Volume untuk persistent auth session
VOLUME ["/app/.wwebjs_auth"]

# Start
CMD ["node", "src/index.js"]
