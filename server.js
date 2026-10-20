
const express = require('express');
const crypto = require('crypto');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = (process.env.BASE_URL || '').replace(/\/+$/, '');
const ADMIN_KEY = process.env.ADMIN_KEY || '';
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('ERRO: configure a variável DATABASE_URL no Render.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
  idleTimeoutMillis: 30000,
  max: 5
});

app.disable('x-powered-by');
app.use(express.json({ limit: '20kb' }));
app.use(express.static(path.join(__dirname, 'public')));

function validHttpUrl(value) {
  try {
    const u = new URL(value);
    return ['http:', 'https:'].includes(u.protocol) &&
      u.hostname.includes('.');
  } catch {
    return false;
  }
}

function makeCode() {
  return crypto.randomBytes(5).toString('base64url').slice(0, 7);
}

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, service: 'Gerino', database: 'connected' });
  } catch (err) {
    console.error('Falha ao verificar banco:', err.message);
    res.status(503).json({ ok: false, service: 'Gerino' });
  }
});

app.post('/api/links', async (req, res) => {
  try {
    const raw = String(req.body?.url || '').trim();

    if (!validHttpUrl(raw)) {
      return res.status(400).json({
        error: 'Informe uma URL válida começando com http:// ou https://.'
      });
    }

    let code;
    let created = false;

    for (let i = 0; i < 5; i++) {
      code = makeCode();

      const result = await pool.query(
        `INSERT INTO links (code, url)
         VALUES ($1, $2)
         ON CONFLICT (code) DO NOTHING
         RETURNING code`,
        [code, raw]
      );

      if (result.rowCount > 0) {
        created = true;
        break;
      }
    }

    if (!created) {
      return res.status(500).json({
        error: 'Não foi possível gerar o link. Tente novamente.'
      });
    }

    const origin = BASE_URL || `https://${req.get('host')}`;

    res.status(201).json({
      code,
      shortUrl: `${origin}/s/${code}`,
      destination: raw
    });
  } catch (err) {
    console.error('Erro ao criar link:', err.message);
    res.status(500).json({ error: 'Erro ao salvar o link.' });
  }
});

app.get('/api/stats', async (req, res) => {
  if (!ADMIN_KEY || req.get('x-admin-key') !== ADMIN_KEY) {
    return res.status(401).json({ error: 'Não autorizado.' });
  }

  try {
    const totals = await pool.query(`
      SELECT COUNT(*)::int AS total_links,
             COALESCE(SUM(clicks), 0)::bigint AS total_clicks
      FROM links
    `);

    const result = await pool.query(`
      SELECT code, url, created_at, clicks
      FROM links
      ORDER BY created_at DESC
      LIMIT 500
    `);

    res.json({
      totalLinks: totals.rows[0].total_links,
      totalClicks: Number(totals.rows[0].total_clicks),
      links: result.rows
    });
  } catch (err) {
    console.error('Erro nas estatísticas:', err.message);
    res.status(500).json({ error: 'Erro ao consultar estatísticas.' });
  }
});

app.get('/s/:code', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT code FROM links WHERE code = $1',
      [req.params.code]
    );

    if (result.rowCount === 0) {
      return res.status(404).sendFile(
        path.join(__dirname, 'public', 'not-found.html')
      );
    }

    res.sendFile(path.join(__dirname, 'public', 'redirect.html'));
  } catch (err) {
    console.error('Erro ao localizar link:', err.message);
    res.status(500).send('Erro interno. Tente novamente.');
  }
});

app.get('/api/resolve/:code', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT url FROM links WHERE code = $1',
      [req.params.code]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        error: 'Este link não existe ou foi removido.'
      });
    }

    res.json({
      destination: result.rows[0].url,
      countdown: 10
    });
  } catch (err) {
    console.error('Erro ao resolver link:', err.message);
    res.status(500).json({ error: 'Erro ao consultar o link.' });
  }
});

app.post('/api/click/:code', async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE links SET clicks = clicks + 1
       WHERE code = $1 RETURNING code`,
      [req.params.code]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Link não encontrado.' });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('Erro ao contar clique:', err.message);
    res.status(500).json({ error: 'Erro ao registrar clique.' });
  }
});

app.get('/report-abuse', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'report.html'));
});

async function start() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS links (
      code TEXT PRIMARY KEY,
      url TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      clicks INTEGER NOT NULL DEFAULT 0
    )
  `);

  app.listen(PORT, () => {
    console.log(`Gerino em execução na porta ${PORT}`);
    console.log('Banco PostgreSQL conectado e tabela links pronta.');
  });
}

start().catch((err) => {
  console.error('Não foi possível iniciar o Gerino:', err.message);
  process.exit(1);
});
  
