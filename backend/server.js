/**
 * backend/server.js
 * Servidor Express para sincronización de artículos
 */

const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));

// Configuración de PostgreSQL
const pool = new Pool({
  host:     'localhost',
  port:     5432,
  database: 'peerreview',
  user:     'postgres',
  password: process.env.DB_PASSWORD || 'h12345z_je',
});

// ─── Health / Ping ────────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/ping', (req, res) => {
  res.status(200).end();
});

// ─── Artículos ────────────────────────────────────────────────────────────────

app.get('/articles', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM articles ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching articles:', error);
    res.status(500).json({ error: 'Error fetching articles' });
  }
});

app.get('/articles/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM articles WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Article not found' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching article:', error);
    res.status(500).json({ error: 'Error fetching article' });
  }
});

app.post('/articles', async (req, res) => {
  const { id, title, file, status, created_at, updated_at, rejection_reason } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO articles (id, title, file, status, created_at, updated_at, rejection_reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO UPDATE SET
         title = EXCLUDED.title,
         file = EXCLUDED.file,
         status = EXCLUDED.status,
         updated_at = EXCLUDED.updated_at,
         rejection_reason = EXCLUDED.rejection_reason
       RETURNING *`,
      [id, title, JSON.stringify(file), status, created_at, updated_at, rejection_reason]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating article:', error);
    res.status(500).json({ error: 'Error creating article' });
  }
});

app.put('/articles/:id', async (req, res) => {
  const { title, file, status, updated_at, rejection_reason } = req.body;
  try {
    const result = await pool.query(
      `UPDATE articles
       SET title = $1, file = $2, status = $3, updated_at = $4, rejection_reason = $5
       WHERE id = $6 RETURNING *`,
      [title, JSON.stringify(file), status, updated_at, rejection_reason, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Article not found' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating article:', error);
    res.status(500).json({ error: 'Error updating article' });
  }
});

app.delete('/articles/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM articles WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Article not found' });
    res.json({ message: 'Article deleted successfully' });
  } catch (error) {
    console.error('Error deleting article:', error);
    res.status(500).json({ error: 'Error deleting article' });
  }
});

// ─── Comentarios ──────────────────────────────────────────────────────────────

/**
 * GET /comments
 * Devuelve TODOS los comentarios — usado por SyncEngine para sincronización global
 */
app.get('/comments', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM comments ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching all comments:', error);
    res.status(500).json({ error: 'Error fetching comments' });
  }
});

/**
 * GET /articles/:id/comments
 * Devuelve comentarios de un artículo específico
 */
app.get('/articles/:id/comments', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM comments WHERE article_id = $1 ORDER BY created_at DESC',
      [req.params.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Error fetching comments' });
  }
});

app.post('/articles/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const { authorId, authorName, authorRole, sections, content } = req.body;
    const commentId = `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const result = await pool.query(
      `INSERT INTO comments (id, article_id, author_id, author_name, author_role, sections, content)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [commentId, id, authorId, authorName, authorRole, JSON.stringify(sections), content]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Error adding comment' });
  }
});

app.put('/comments/:id', async (req, res) => {
  try {
    const { sections, content } = req.body;
    const result = await pool.query(
      `UPDATE comments SET sections = $1, content = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 RETURNING *`,
      [JSON.stringify(sections), content, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Comment not found' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating comment:', error);
    res.status(500).json({ error: 'Error updating comment' });
  }
});

app.delete('/comments/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM comments WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Comment not found' });
    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: 'Error deleting comment' });
  }
});

// ─── Sincronización ───────────────────────────────────────────────────────────

app.post('/sync', async (req, res) => {
  const { articles } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const article of articles) {
      await client.query(
        `INSERT INTO articles (id, title, file, status, created_at, updated_at, rejection_reason)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO UPDATE SET
           title = EXCLUDED.title,
           file = EXCLUDED.file,
           status = EXCLUDED.status,
           updated_at = EXCLUDED.updated_at,
           rejection_reason = EXCLUDED.rejection_reason`,
        [article.id, article.title, JSON.stringify(article.file),
         article.status, article.createdAt, article.updatedAt,
         article.rejectionReason]
      );
    }
    await client.query('COMMIT');
    const result = await pool.query('SELECT * FROM articles ORDER BY created_at DESC');
    res.json({ success: true, articles: result.rows, serverTimestamp: new Date().toISOString() });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error syncing:', error);
    res.status(500).json({ error: 'Error syncing data' });
  } finally {
    client.release();
  }
});

app.post('/sync/comments', async (req, res) => {
  const { comments } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const comment of comments) {
      const { _operation, ...commentData } = comment;
      if (_operation === 'CREATE_COMMENT') {
        await client.query(
          `INSERT INTO comments (id, article_id, author_id, author_name, author_role, sections, content)
           VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO NOTHING`,
          [commentData.id, commentData.articleId, commentData.authorId,
           commentData.authorName, commentData.authorRole,
           JSON.stringify(commentData.sections), commentData.content]
        );
      } else if (_operation === 'UPDATE_COMMENT') {
        await client.query(
          `UPDATE comments SET sections = $1, content = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
          [JSON.stringify(commentData.sections), commentData.content, commentData.id]
        );
      } else if (_operation === 'DELETE_COMMENT') {
        await client.query('DELETE FROM comments WHERE id = $1', [commentData.id]);
      }
    }
    await client.query('COMMIT');
    res.json({ success: true, message: 'Comments synced successfully', serverTimestamp: new Date().toISOString() });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error syncing comments:', error);
    res.status(500).json({ error: 'Error syncing comments' });
  } finally {
    client.release();
  }
});

app.get('/sync', async (req, res) => {
  const { since } = req.query;
  try {
    let query = 'SELECT * FROM articles';
    let params = [];
    if (since) {
      query += ' WHERE updated_at > $1';
      params.push(since);
    }
    query += ' ORDER BY updated_at DESC';
    const result = await pool.query(query, params);
    res.json({ articles: result.rows, serverTimestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Error fetching sync data:', error);
    res.status(500).json({ error: 'Error fetching sync data' });
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
  console.log(`📊 Endpoints disponibles:`);
  console.log(`   GET    /health`);
  console.log(`   GET    /ping`);
  console.log(`   GET    /articles`);
  console.log(`   POST   /articles`);
  console.log(`   PUT    /articles/:id`);
  console.log(`   DELETE /articles/:id`);
  console.log(`   GET    /comments              ← nuevo`);
  console.log(`   GET    /articles/:id/comments`);
  console.log(`   POST   /articles/:id/comments`);
  console.log(`   PUT    /comments/:id`);
  console.log(`   DELETE /comments/:id`);
  console.log(`   POST   /sync`);
  console.log(`   POST   /sync/comments`);
  console.log(`   GET    /sync`);
});