# ── CryptoEdge Pro — Cloud Run server image ───────────────────────────────────
# Runs only the Node proxy (server.js).
# The React frontend is served from GitHub Pages and calls this server
# for Gemini API proxying.
#
# Build:  docker build -t cryptoedge-server .
# Run:    docker run -p 8080:8080 -e GEMINI_API_KEY=your_key cryptoedge-server
# Deploy: gcloud run deploy cryptoedge --source . --region us-central1 \
#           --set-env-vars GEMINI_API_KEY=your_key \
#           --allow-unauthenticated

FROM node:18-slim

# Cloud Run requires the app to listen on $PORT (default 8080)
ENV PORT=8080
ENV NODE_ENV=production

WORKDIR /app

# Copy only what the server needs — not the React src
COPY package.json ./
COPY server.js    ./

# Install production deps only (no devDependencies)
RUN npm install --omit=dev --ignore-scripts

# Non-root user for security
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
USER appuser

EXPOSE 8080

CMD ["node", "server.js"]
