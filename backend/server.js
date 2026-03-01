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
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Configuración de PostgreSQL - ajusta estos valores según tu instalación
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'peerreview',
  user: 'postgres',
  password: 'h12345z_je',
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Obtener todos los artículos
app.get('/articles', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM articles ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching articles:', error);
    res.status(500).json({ error: 'Error fetching articles' });
  }
});

// Obtener un artículo por ID
app.get('/articles/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM articles WHERE id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Article not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching article:', error);
    res.status(500).json({ error: 'Error fetching article' });
  }
});

app.get('/ping', (req, res) => {
  res.status(200).end();
});

// Crear o actualizar un artículo (UPSERT)
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

// Actualizar un artículo
app.put('/articles/:id', async (req, res) => {
  const { title, file, status, updated_at, rejection_reason } = req.body;
  
  try {
    const result = await pool.query(
      `UPDATE articles 
       SET title = $1, file = $2, status = $3, updated_at = $4, rejection_reason = $5
       WHERE id = $6
       RETURNING *`,
      [title, JSON.stringify(file), status, updated_at, rejection_reason, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Article not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating article:', error);
    res.status(500).json({ error: 'Error updating article' });
  }
});

// Eliminar un artículo
app.delete('/articles/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM articles WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Article not found' });
    }
    res.json({ message: 'Article deleted successfully' });
  } catch (error) {
    console.error('Error deleting article:', error);
    res.status(500).json({ error: 'Error deleting article' });
  }
});

// Endpoint de sincronización - recibe todos los artículos del cliente
app.post('/sync', async (req, res) => {
  const { articles } = req.body;
  
  try {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Guardar artículos del cliente
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
      
      // Devolver todos los artículos actualizados
      const result = await pool.query(
        'SELECT * FROM articles ORDER BY created_at DESC'
      );
      
      res.json({
        success: true,
        articles: result.rows,
        serverTimestamp: new Date().toISOString()
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error syncing:', error);
    res.status(500).json({ error: 'Error syncing data' });
  }
});

// Obtener artículos modificados desde una fecha
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
    res.json({
      articles: result.rows,
      serverTimestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching sync data:', error);
    res.status(500).json({ error: 'Error fetching sync data' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Endpoints:`);
  console.log(`   GET    /health     - Health check`);
  console.log(`   GET    /articles   - Listar artículos`);
  console.log(`   POST   /articles   - Crear/actualizar artículo`);
  console.log(`   DELETE /articles/:id - Eliminar artículo`);
  console.log(`   POST   /sync       - Sincronizar artículos`);
});
