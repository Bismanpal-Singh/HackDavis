const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');
const backendEnvPath = path.join(repoRoot, 'backend', '.env');
const outputPath = path.join(__dirname, '..', 'backend.config.ts');
const fallbackValue = 'https://your-current-cloudflare-or-ngrok-url';

function readPublicBaseUrl() {
  if (!fs.existsSync(backendEnvPath)) {
    return fallbackValue;
  }

  const envText = fs.readFileSync(backendEnvPath, 'utf8');
  const match = envText.match(/^PUBLIC_BASE_URL=(.+)$/m);
  if (!match) {
    return fallbackValue;
  }

  return match[1].trim().replace(/^['"]|['"]$/g, '');
}

const publicBaseUrl = readPublicBaseUrl();
const fileContents = `export const BACKEND_HTTP_URL = ${JSON.stringify(
  publicBaseUrl,
)};\n`;

fs.writeFileSync(outputPath, fileContents, 'utf8');
console.log(`[sync-backend-config] BACKEND_HTTP_URL=${publicBaseUrl}`);
