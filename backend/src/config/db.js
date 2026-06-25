import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let dbInstance = null;

/**
 * Get or initialize the database connection.
 * Creates tables if they do not exist.
 */
export async function getDbConnection() {
  if (dbInstance) {
    return dbInstance;
  }

  const databasePath = process.env.DATABASE_FILE || './database.sqlite';
  
  // Resolve path to ensure it is correctly located
  const resolvedPath = path.isAbsolute(databasePath)
    ? databasePath
    : path.resolve(__dirname, '../../', databasePath);

  console.log(`[Database] Connecting to SQLite database at: ${resolvedPath}`);

  // Open database connection
  dbInstance = await open({
    filename: resolvedPath,
    driver: sqlite3.Database
  });

  // Enable foreign key support
  await dbInstance.get('PRAGMA foreign_keys = ON');

  // Initialize DB tables (Schema)
  await initSchema(dbInstance);

  // Autoseed if the menu_items table is empty
  await checkAndAutoSeed(dbInstance);

  return dbInstance;
}

/**
 * Creates initial schema structures if they do not exist.
 */
async function initSchema(db) {
  console.log('[Database] Initializing tables...');

  // Menu Items (Updated to support availability status)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS menu_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      category TEXT NOT NULL,
      subcategory TEXT NOT NULL,
      is_veg INTEGER NOT NULL,     -- 1 for Veg, 0 for Non-Veg
      is_available INTEGER DEFAULT 1, -- 1 for Available, 0 for Unavailable
      image_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tables
  await db.exec(`
    CREATE TABLE IF NOT EXISTS tables (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_number TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Orders
  await db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_number TEXT NOT NULL,
      total_amount REAL NOT NULL,
      status TEXT CHECK(status IN ('pending', 'preparing', 'ready', 'served', 'completed', 'cancelled')) DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Order Items
  await db.exec(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      menu_item_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      price REAL NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
      FOREIGN KEY (menu_item_id) REFERENCES menu_items (id) ON DELETE RESTRICT
    )
  `);

  // Settings table for key-value configuration
  await db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  // Seed default settings if empty
  const hasSettings = await db.get('SELECT COUNT(*) as count FROM settings');
  if (hasSettings.count === 0) {
    console.log('[Database] Seeding default restaurant configurations...');
    await db.run("INSERT INTO settings (key, value) VALUES ('restaurant_name', 'Lakshmi Ganesh Restaurant')");
    await db.run("INSERT INTO settings (key, value) VALUES ('gst_percentage', '5.0')");
    await db.run("INSERT INTO settings (key, value) VALUES ('service_charge_percentage', '2.5')");
  }

  // Users (for dashboard access)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT CHECK(role IN ('admin', 'staff', 'kitchen')) DEFAULT 'staff',
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('[Database] Database tables initialized successfully.');
}

/**
 * Checks if the menu is empty and seeds it automatically.
 */
async function checkAndAutoSeed(db) {
  try {
    const row = await db.get('SELECT COUNT(*) as count FROM menu_items');
    if (row.count === 0) {
      console.log('[Database] menu_items table is empty. Running database seeder...');
      const { seedDatabase } = await import('./seed.js');
      await seedDatabase(db);
    } else {
      console.log(`[Database] Database already seeded with ${row.count} menu items.`);
    }
  } catch (err) {
    console.error('[Database] Failed to check or seed database:', err);
  }
}
