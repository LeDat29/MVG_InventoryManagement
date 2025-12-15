/**
 * Add is_active column to warehouse_zones and set existing rows to active (1)
 */
const mysql = require('mysql2/promise');
require('dotenv').config();

async function ensureIsActiveOnZones() {
  const config = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '123456',
    database: process.env.DB_NAME || 'kho_mvg',
    multipleStatements: true,
  };

  let conn;
  try {
    console.log('Connecting to MySQL...', config.host, config.database);
    conn = await mysql.createConnection(config);

    // Ensure table exists
    const [tbl] = await conn.execute("SHOW TABLES LIKE 'warehouse_zones'");
    if (tbl.length === 0) {
      throw new Error("Table 'warehouse_zones' does not exist. Please create it first.");
    }

    // Check if column exists
    const [col] = await conn.execute(`
      SELECT COUNT(*) AS cnt
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'warehouse_zones'
        AND COLUMN_NAME = 'is_active'
    `);
    const hasCol = (col[0] && col[0].cnt > 0);

    if (!hasCol) {
      console.log("Adding column 'is_active' to warehouse_zones...");
      await conn.execute("ALTER TABLE warehouse_zones ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER status");
      console.log('Column added.');
    } else {
      console.log("Column 'is_active' already exists.");
    }

    // Set all existing rows to active (1)
    console.log('Updating all existing zones to is_active = 1...');
    await conn.execute('UPDATE warehouse_zones SET is_active = 1 WHERE is_active IS NULL OR is_active != 1');

    // Optional: add index for performance
    try {
      await conn.execute('CREATE INDEX IF NOT EXISTS idx_wz_project_active ON warehouse_zones(project_id, is_active)');
    } catch (e) {
      // MariaDB/MySQL older versions do not support IF NOT EXISTS for index creation
      try {
        const [idxRows] = await conn.execute(`
          SELECT COUNT(1) AS cnt
          FROM INFORMATION_SCHEMA.STATISTICS
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'warehouse_zones'
            AND INDEX_NAME = 'idx_wz_project_active'
        `);
        if (!idxRows[0] || idxRows[0].cnt === 0) {
          await conn.execute('CREATE INDEX idx_wz_project_active ON warehouse_zones(project_id, is_active)');
        }
      } catch (e2) {
        console.warn('Could not ensure index idx_wz_project_active:', e2.message);
      }
    }

    console.log('Done.');
  } catch (err) {
    console.error('Error:', err.message);
    process.exitCode = 1;
  } finally {
    if (conn) await conn.end();
  }
}

ensureIsActiveOnZones();
