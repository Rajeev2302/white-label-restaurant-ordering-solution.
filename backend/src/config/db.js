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
      status TEXT CHECK(status IN ('pending', 'accepted', 'preparing', 'ready', 'served', 'completed', 'cancelled')) DEFAULT 'pending',
      payment_status TEXT CHECK(payment_status IN ('Paid', 'Unpaid')) DEFAULT 'Unpaid',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      accepted_at DATETIME,
      ready_at DATETIME,
      served_at DATETIME,
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

  // Seed default settings if missing
  console.log('[Database] Ensuring default restaurant configurations exist...');
  const defaultSettings = [
    { key: 'restaurant_name', value: 'Lakshmi Ganesh Restaurant' },
    { key: 'logo_url', value: 'https://res.cloudinary.com/dwatx4zlt/image/upload/v1782051849/Logo_copy_imxucw.jpg' },
    { key: 'phone_number', value: '+91 98765 43210' },
    { key: 'address', value: 'H.No. 12-34, Main Road, Hyderabad, 500001' },
    { key: 'theme_color', value: '#d4af37' },
    { key: 'currency_symbol', value: '₹' },
    { key: 'tagline', value: 'Authentic Indian Flavors' },
    { key: 'gst_percentage', value: '5.0' },
    { key: 'service_charge_percentage', value: '2.5' }
  ];

  for (const setting of defaultSettings) {
    await db.run('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)', [setting.key, setting.value]);
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

  // Migration: Check if existing orders table has the 'accepted' status constraint. If not, recreate/migrate it.
  try {
    const schemaRow = await db.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='orders'");
    if (schemaRow && schemaRow.sql && !schemaRow.sql.includes("'accepted'")) {
      console.log("[Migration] Re-creating 'orders' table to include 'accepted' in CHECK constraint...");
      await db.run("PRAGMA foreign_keys=OFF");
      await db.run("BEGIN TRANSACTION");
      
      // Create new table with updated check constraint
      await db.exec(`
        CREATE TABLE IF NOT EXISTS orders_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          table_number TEXT NOT NULL,
          total_amount REAL NOT NULL,
          status TEXT CHECK(status IN ('pending', 'accepted', 'preparing', 'ready', 'served', 'completed', 'cancelled')) DEFAULT 'pending',
          payment_status TEXT CHECK(payment_status IN ('Paid', 'Unpaid')) DEFAULT 'Unpaid',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          accepted_at DATETIME,
          ready_at DATETIME,
          served_at DATETIME,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Copy data from old orders table to new one
      await db.run("INSERT INTO orders_new (id, table_number, total_amount, status, created_at, updated_at) SELECT id, table_number, total_amount, status, created_at, updated_at FROM orders");
      
      // Drop old orders table
      await db.run("DROP TABLE orders");
      
      // Rename orders_new to orders
      await db.run("ALTER TABLE orders_new RENAME TO orders");
      
      await db.run("COMMIT");
      await db.run("PRAGMA foreign_keys=ON");
      console.log("[Migration] 'orders' table migrated successfully.");
    }
  } catch (migrationErr) {
    console.error("[Migration] Failed to migrate 'orders' table check constraint:", migrationErr);
  }

  // Migration: Check for the presence of the new order history tracker columns and add them dynamically
  try {
    const tableInfo = await db.all("PRAGMA table_info(orders)");
    const columns = tableInfo.map(info => info.name);
    
    if (!columns.includes('payment_status')) {
      console.log("[Migration] Adding 'payment_status' column to 'orders' table...");
      await db.run("ALTER TABLE orders ADD COLUMN payment_status TEXT DEFAULT 'Unpaid'");
    }
    if (!columns.includes('accepted_at')) {
      console.log("[Migration] Adding 'accepted_at' column to 'orders' table...");
      await db.run("ALTER TABLE orders ADD COLUMN accepted_at DATETIME");
    }
    if (!columns.includes('ready_at')) {
      console.log("[Migration] Adding 'ready_at' column to 'orders' table...");
      await db.run("ALTER TABLE orders ADD COLUMN ready_at DATETIME");
    }
    if (!columns.includes('served_at')) {
      console.log("[Migration] Adding 'served_at' column to 'orders' table...");
      await db.run("ALTER TABLE orders ADD COLUMN served_at DATETIME");
    }
  } catch (columnMigrationErr) {
    console.error("[Migration] Failed to migrate orders columns:", columnMigrationErr);
  }

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
