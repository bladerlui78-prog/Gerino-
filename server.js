const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = (process.env.BASE_URL || '').replace(/\/+$/, '');
const ADMIN_KEY = process.env.ADMIN_KEY || '';
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'links.json');
fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, '{}');

app.disable('x-powered-by');
app.use(express.json({ limit: '20kb' }));
app.use(express.static(path.join(__dirname, 'public')));

function readLinks() {
  try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); }
  catch { return {}; }
}
function writeLinks(data) {
  const temp = DB_FILE + '.tmp';
  fs.writeFileSync(temp, JSON.stringify(data, null, 2));
  fs.renameSync(temp, DB_FILE);
}
function validHttpUrl(value) {
  try {
    const u = new URL(value);
    return ['http:', 'https:'].includes(u.protocol) && u.hostname.includes('.');
  } catch { return false; }
}
function makeCode() { return crypto.randomBytes(4).toString('base64url').slice(0, 7); }

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'Gerino' }));

app.post('/api/links', (req, res) => {
  const raw = String(req.body?.url || '').trim();
  if (!validHttpUrl(raw)) return res.status(400).json({ error: 'Informe uma URL válida começando com http:// ou https://.' });
  const links = readLinks();
  let code;
  do { code = makeCode(); } while (links[code]);
  links[code] = { url: raw, createdAt: new Date().toISOString(), clicks: 0 };
  writeLinks(links);
  const origin = BASE_URL || `${req.protocol}://${req.get('host')}`;
  res.status(201).json({ code, shortUrl: `${origin}/s/${code}`, destination: raw });
});

app.get('/api/stats', (req, res) => {
  if (!ADMIN_KEY || req.get('x-admin-key') !== ADMIN_KEY) return res.status(401).json({ error: 'Não autorizado.' });
  const links = Object.values(readLinks());
  res.json({ totalLinks: links.length, totalClicks: links.reduce((n, x) => n + x.clicks, 0), links });
});

app.get('/s/:code', (req, res) => {
  const links = readLinks();
  const link = links[req.params.code];
  if (!link) return res.status(404).sendFile(path.join(__dirname, 'public', 'not-found.html'));
  res.sendFile(path.join(__dirname, 'public', 'redirect.html'));
});

app.get('/api/resolve/:code', (req, res) => {
  const links = readLinks();
  const link = links[req.params.code];
  if (!link) return res.status(404).json({ error: 'Este link não existe ou foi removido.' });
  res.json({ destination: link.url, countdown: 10 });
});

app.post('/api/click/:code', (req, res) => {
  const links = readLinks();
  const link = links[req.params.code];
  if (!link) return res.status(404).json({ error: 'Link não encontrado.' });
  link.clicks = (link.clicks || 0) + 1;
  writeLinks(links);
  res.json({ ok: true });
});

app.get('/report-abuse', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'report.html')));

app.listen(PORT, () => console.log(`Gerino em execução na porta ${PORT}`));