/**
 * CryptoEdge Pro — Claude Proxy Server
 *
 * Spawns the locally-installed `claude` CLI and auto-routes through the
 * Cowork managed proxy (localhost:45949) so corporate networks work.
 *
 *   node server.js        ← terminal 1
 *   npm start             ← terminal 2
 */

const http   = require('http');
const net    = require('net');
const tls    = require('tls');
const { spawn, execSync } = require('child_process');
const fs     = require('fs');
const os     = require('os');
const path   = require('path');
const crypto = require('crypto');

// ── Config ────────────────────────────────────────────────────────────────────
const PORT       = process.env.PORT || 3001;
const TIMEOUT_MS = 120_000;

// Cowork runs an HTTP proxy on the host Mac — we route through it automatically
const COWORK_PROXY_PORT = 45949;

// ── Logging ───────────────────────────────────────────────────────────────────
function log(tag, ...args) {
  const ts = new Date().toISOString().slice(11, 23);
  console.log(`[${ts}] [${tag}]`, ...args);
}

// ── State ─────────────────────────────────────────────────────────────────────
let activeProcess = null;

// ── Find claude binary ────────────────────────────────────────────────────────
function findClaude() {
  if (process.env.CLAUDE_BIN) return process.env.CLAUDE_BIN;
  const candidates = [
    '/usr/local/bin/claude',
    '/opt/homebrew/bin/claude',
    `${os.homedir()}/.local/bin/claude`,
    `${os.homedir()}/.npm/bin/claude`,
    `${os.homedir()}/.yarn/bin/claude`,
    `${os.homedir()}/Library/pnpm/claude`,
  ];
  // NVM paths
  try {
    const nvmDir = `${os.homedir()}/.nvm/versions/node`;
    if (fs.existsSync(nvmDir)) {
      fs.readdirSync(nvmDir).forEach(v => candidates.push(`${nvmDir}/${v}/bin/claude`));
    }
  } catch {}
  for (const c of candidates) {
    try { fs.accessSync(c, fs.constants.X_OK); return c; } catch {}
  }
  try {
    const found = execSync('which claude 2>/dev/null || command -v claude 2>/dev/null', { encoding: 'utf8', timeout: 3000 }).trim();
    if (found) return found;
  } catch {}
  return 'claude';
}

// ── Check if Cowork proxy is available on the host ────────────────────────────
function proxyAvailable(port) {
  return new Promise(resolve => {
    const s = net.createConnection(port, '127.0.0.1');
    s.setTimeout(1500);
    s.on('connect',  () => { s.destroy(); resolve(true);  });
    s.on('error',    () => resolve(false));
    s.on('timeout',  () => { s.destroy(); resolve(false); });
  });
}

// ── Spawn claude CLI ──────────────────────────────────────────────────────────
function callClaude({ prompt, systemPrompt, model = 'claude-sonnet-4-5' }, useProxy) {
  return new Promise((resolve, reject) => {
    if (activeProcess) {
      log('WARN', 'Killing leftover process');
      try { activeProcess.proc.kill('SIGTERM'); } catch {}
      activeProcess = null;
    }

    const claudeBin = findClaude();
    const id        = crypto.randomUUID().slice(0, 8);
    const shell     = process.env.SHELL || '/bin/zsh';

    // Build the proxy-aware environment
    const proxyEnv = useProxy ? {
      HTTP_PROXY:  `http://127.0.0.1:${COWORK_PROXY_PORT}`,
      HTTPS_PROXY: `http://127.0.0.1:${COWORK_PROXY_PORT}`,
      http_proxy:  `http://127.0.0.1:${COWORK_PROXY_PORT}`,
      https_proxy: `http://127.0.0.1:${COWORK_PROXY_PORT}`,
    } : {};

    // Merge system prompt into the user prompt.
    // Use a <system> block so we avoid the --system-prompt flag entirely.
    const fullPrompt = systemPrompt
      ? `<system>\n${systemPrompt}\n</system>\n\n${prompt}`
      : prompt;

    // Add the directory that contains the claude binary to PATH so that
    // its #!/usr/bin/env node shebang resolves the correct Node.js version
    // (important when the binary lives inside an NVM version directory).
    const claudeDir     = path.dirname(fs.realpathSync(claudeBin).replace(/\s.*/, ''));
    const augmentedPath = `${claudeDir}:${process.env.PATH || '/usr/local/bin:/usr/bin:/bin'}`;

    const env = {
      ...process.env,
      PATH: augmentedPath,
      ...proxyEnv,
    };

    // Spawn claude directly — no shell, no file redirect, no quoting issues.
    // The prompt is written to stdin; claude -p reads from stdin when no
    // positional argument is given.
    //
    // Flags:
    //   -p               → non-interactive print mode
    //   --output-format json  → machine-readable JSON envelope
    //   --model <name>   → full model string (not shorthand like "sonnet")
    log('START', `id=${id}  proxy=${useProxy ? `localhost:${COWORK_PROXY_PORT}` : 'none'}`);
    log('START', `bin=${claudeBin}  chars=${fullPrompt.length}`);

    // No --model flag — let the locally installed claude use its default model.
    // This avoids model-name mismatches between CLI versions and the Anthropic API.
    const proc = spawn(claudeBin, ['-p', '--output-format', 'json'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env,
    });

    activeProcess = { proc, id, startedAt: Date.now() };

    // Write the full prompt to stdin and close it
    proc.stdin.write(fullPrompt, 'utf8');
    proc.stdin.end();

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', chunk => {
      const text = chunk.toString();
      stdout += text;
      log('STDOUT', text.slice(0, 150).replace(/\n/g, '↵'));
    });
    proc.stderr.on('data', chunk => {
      const text = chunk.toString();
      stderr += text;
      log('STDERR', text.slice(0, 200).replace(/\n/g, '↵'));
    });

    proc.on('error', err => {
      log('ERROR', 'spawn failed:', err.message);
      cleanup();
      reject(new Error(`Cannot start claude: ${err.message}\nTried: ${claudeBin}`));
    });

    const timer = setTimeout(() => {
      log('TIMEOUT', `${TIMEOUT_MS / 1000}s exceeded — killing`);
      cleanup();
      reject(new Error(`Timed out after ${TIMEOUT_MS / 1000}s`));
    }, TIMEOUT_MS);

    proc.on('close', (code, signal) => {
      clearTimeout(timer);
      const elapsed = Date.now() - (activeProcess?.startedAt ?? Date.now());
      log('CLOSE', `code=${code}  signal=${signal}  elapsed=${elapsed}ms`);
      log('CLOSE', `stdout=${stdout.length}b  stderr=${stderr.length}b`);
      cleanup();

      // (no temp file to clean up — prompt was written directly to stdin)

      if (signal === 'SIGTERM' || signal === 'SIGKILL') {
        return reject(new Error('ABORTED'));
      }

      if (!stdout.trim()) {
        // Show stderr for diagnosis — truncate to avoid giant JS source dumps
        const rawErr = stderr.trim() || `No output (exit ${code})`;
        // If stderr is a node crash dump (starts with a file:// URL), give a cleaner message
        const detail = rawErr.startsWith('file://') || rawErr.startsWith('Error:')
          ? `Claude CLI crashed (exit ${code}). Check that 'claude -p --help' works in your terminal.\n\nRaw: ${rawErr.slice(0, 300)}`
          : rawErr;
        log('ERROR', detail.slice(0, 400));
        return reject(new Error(detail));
      }

      try {
        const parsed = JSON.parse(stdout.trim());
        log('RESULT', `is_error=${parsed.is_error}  cost=$${parsed.total_cost_usd?.toFixed(4) ?? '?'}`);
        if (parsed.is_error) {
          const msg = parsed.result || stderr || `claude error (exit ${code})`;
          log('ERROR', msg.slice(0, 300));

          if (msg.includes('ENOTFOUND') || msg.includes('Unable to connect')) {
            return reject(new Error(
              `Network error — cannot reach Anthropic API.\n` +
              (useProxy
                ? 'Even with Cowork proxy. Try: claude -p "hello" in your terminal.'
                : 'Retrying via Cowork proxy…')
            ));
          }
          return reject(new Error(msg));
        }
        resolve(parsed.result ?? '');
      } catch (e) {
        log('ERROR', 'JSON parse failed:', e.message, '| raw:', stdout.slice(0, 300));
        reject(new Error(`Failed to parse claude output: ${e.message}\n\nRaw output (first 200 chars):\n${stdout.slice(0, 200)}`));
      }
    });

    function cleanup() { activeProcess = null; }
  });
}

// ── HTTP server ───────────────────────────────────────────────────────────────
function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin',  'http://localhost:3000');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', c => { raw += c; });
    req.on('end',  () => { try { resolve(JSON.parse(raw)); } catch(e) { reject(e); } });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // POST /api/claude
  if (req.method === 'POST' && req.url === '/api/claude') {
    log('HTTP', 'POST /api/claude');
    try {
      const body     = await readBody(req);
      const useProxy = await proxyAvailable(COWORK_PROXY_PORT);
      log('HTTP', `Cowork proxy on :${COWORK_PROXY_PORT} → ${useProxy ? 'DETECTED ✓' : 'not found'}`);

      let content;
      try {
        content = await callClaude(body, useProxy);
      } catch (err) {
        // If network error and we haven't tried proxy yet, try the other way
        if (!useProxy && (err.message.includes('ENOTFOUND') || err.message.includes('Unable to connect'))) {
          log('RETRY', 'Direct failed — retrying via proxy fallback on :45949');
          content = await callClaude(body, true);
        } else {
          throw err;
        }
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ content }));
    } catch (err) {
      const isAbort = err.message === 'ABORTED';
      log('HTTP', `→ ${isAbort ? 499 : 500}  ${err.message.slice(0, 100)}`);
      res.writeHead(isAbort ? 499 : 500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // POST /api/claude/abort
  if (req.method === 'POST' && req.url === '/api/claude/abort') {
    log('HTTP', 'POST /api/claude/abort');
    if (activeProcess) {
      try { activeProcess.proc.kill('SIGTERM'); } catch {}
      activeProcess = null;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ aborted: true }));
    } else {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ aborted: false }));
    }
    return;
  }

  // GET /health
  if (req.method === 'GET' && req.url === '/health') {
    const claudeBin  = findClaude();
    const useProxy   = await proxyAvailable(COWORK_PROXY_PORT);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', claude: claudeBin, proxy: useProxy ? `localhost:${COWORK_PROXY_PORT}` : null }));
    return;
  }

  res.writeHead(404); res.end();
});

server.listen(PORT, '127.0.0.1', async () => {
  const claudeBin = findClaude();
  const useProxy  = await proxyAvailable(COWORK_PROXY_PORT);
  console.log('\n══════════════════════════════════════════════════');
  console.log('  ◈  CryptoEdge Pro — Claude Proxy Server');
  console.log('══════════════════════════════════════════════════');
  console.log(`  Port     : http://localhost:${PORT}`);
  console.log(`  Claude   : ${claudeBin}`);
  console.log(`  Proxy    : ${useProxy ? `✓ Cowork proxy detected (localhost:${COWORK_PROXY_PORT})` : `✗ not found (will try direct)`}`);
  console.log('══════════════════════════════════════════════════');

  try {
    fs.accessSync(claudeBin, fs.constants.X_OK);
    console.log(`  ✓ claude binary found and executable`);
  } catch {
    console.warn(`  ⚠ "${claudeBin}" not found — set CLAUDE_BIN env var`);
  }
  console.log('\n  Keep this running alongside: npm start\n');
});

server.on('error', err => {
  if (err.code === 'EADDRINUSE') console.error(`\n⚠ Port ${PORT} in use — try PORT=3002 node server.js\n`);
  else console.error(err);
  process.exit(1);
});

process.on('SIGINT',  () => { if (activeProcess) try { activeProcess.proc.kill(); } catch {} process.exit(0); });
process.on('SIGTERM', () => { if (activeProcess) try { activeProcess.proc.kill(); } catch {} process.exit(0); });
