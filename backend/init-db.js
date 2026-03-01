/**
 * backend/init-db.js
 * Script para inicializar la base de datos PostgreSQL
 * 
 * Uso: node init-db.js
 */

const { Pool } = require('pg');

// Configuración - ajusta según tu instalación de PostgreSQL
const config = {
  host: 'localhost',
  port: 5432,
  database: 'peerreview',  // Conectamos a postgres para crear la base de datos
  user: 'postgres',
  password: 'h12345z_je',
};

const DB_NAME = 'peerreview';

async function initDB() {
  const pool = new Pool(config);
  
  try {
    console.log('🔄 Inicializando base de datos...');
    
    // Crear base de datos si no existe
    const checkDb = await pool.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [DB_NAME]
    );
    
    if (checkDb.rows.length === 0) {
      await pool.query(`CREATE DATABASE ${DB_NAME}`);
      console.log(`✅ Base de datos '${DB_NAME}' creada`);
    } else {
      console.log(`ℹ️ Base de datos '${DB_NAME}' ya existe`);
    }
    
    // Cerrar conexión a postgres
    await pool.end();
    
    // Conectar a la nueva base de datos
    const appPool = new Pool({
      ...config,
      database: DB_NAME,
    });
    
    // Crear tabla de artículos
    await appPool.query(`
      CREATE TABLE IF NOT EXISTS articles (
        id VARCHAR(255) PRIMARY KEY,
        title TEXT NOT NULL,
        file JSONB,
        status VARCHAR(50) DEFAULT 'Recibido',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        rejection_reason TEXT
      )
    `);
    console.log('✅ Tabla articles creada');

    // Crear tabla de cola de sincronización
    await appPool.query(`
      CREATE TABLE IF NOT EXISTS sync_queue (
        id SERIAL PRIMARY KEY,
        operation VARCHAR(50) NOT NULL,
        article_id VARCHAR(255) NOT NULL,
        article_data JSONB,
        status VARCHAR(50) DEFAULT 'pending',
        client_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        synced_at TIMESTAMP WITH TIME ZONE
      )
    `);
    console.log('✅ Tabla sync_queue creada');
    
    await appPool.end();
    console.log('🎉 Base de datos inicializada correctamente');
    console.log('');
    console.log('📋 Para iniciar el servidor:');
    console.log('   1. cd backend');
    console.log('   2. npm install');
    console.log('   3. npm start');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('');
    console.log('💡 Verifica que PostgreSQL esté corriendo:');
    console.log('   - Asegúrate de que PostgreSQL esté instalado');
    console.log('   - Verifica que el servicio esté activo');
    console.log('   - Revisa usuario y contraseña en init-db.js');
    process.exit(1);
  }
}

initDB();
