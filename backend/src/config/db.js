import pg from 'pg';
const { Pool } = pg;

let poolInstance = null;

/**
 * Get or initialize the PostgreSQL database connection pool.
 * Creates tables if they do not exist.
 */
export async function getDbConnection() {
  if (poolInstance) {
    return poolInstance;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is missing!');
  }

  console.log('[Database] Connecting to PostgreSQL database...');

  poolInstance = new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === 'production' || connectionString.includes('onrender.com') || connectionString.includes('dpg-')
      ? { rejectUnauthorized: false }
      : false
  });

  // Emulate SQLite helpers for query execution compatibility
  poolInstance.all = async (sql, params = []) => {
    const res = await poolInstance.query(sql, params);
    return res.rows;
  };

  poolInstance.get = async (sql, params = []) => {
    const res = await poolInstance.query(sql, params);
    return res.rows[0];
  };

  poolInstance.run = async (sql, params = []) => {
    const res = await poolInstance.query(sql, params);
    return {
      lastID: res.rows[0]?.id || null,
      changes: res.rowCount
    };
  };

  // Test connection
  const client = await poolInstance.connect();
  try {
    console.log('[Database] PostgreSQL connection established successfully.');
  } finally {
    client.release();
  }

  // Initialize DB tables (Schema)
  await initSchema(poolInstance);

  // Autoseed if the menu_items table is empty
  await checkAndAutoSeed(poolInstance);

  return poolInstance;
}

/**
 * Creates initial schema structures if they do not exist.
 */
async function initSchema(db) {
  console.log('[Database] Initializing PostgreSQL tables...');

  // Menu Items (Updated to support availability status)
  await db.query(`
    CREATE TABLE IF NOT EXISTS menu_items (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      price REAL NOT NULL,
      category VARCHAR(255) NOT NULL,
      subcategory VARCHAR(255) NOT NULL,
      is_veg INTEGER NOT NULL,            -- 1 for Veg, 0 for Non-Veg
      is_available INTEGER DEFAULT 1,     -- 1 for Available, 0 for Unavailable
      image_url TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tables
  await db.query(`
    CREATE TABLE IF NOT EXISTS tables (
      id SERIAL PRIMARY KEY,
      table_number VARCHAR(50) NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Orders
  await db.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      table_number VARCHAR(50) NOT NULL,
      total_amount REAL NOT NULL,
      status VARCHAR(50) CHECK(status IN ('pending', 'accepted', 'preparing', 'ready', 'served', 'completed', 'cancelled')) DEFAULT 'pending',
      payment_status VARCHAR(50) CHECK(payment_status IN ('Paid', 'Unpaid')) DEFAULT 'Unpaid',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      accepted_at TIMESTAMP,
      ready_at TIMESTAMP,
      served_at TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Order Items
  await db.query(`
    CREATE TABLE IF NOT EXISTS order_items (
      id SERIAL PRIMARY KEY,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      menu_item_id INTEGER NOT NULL REFERENCES menu_items(id) ON DELETE RESTRICT,
      quantity INTEGER NOT NULL,
      price REAL NOT NULL
    )
  `);

  // Settings table for key-value configuration
  await db.query(`
    CREATE TABLE IF NOT EXISTS settings (
      key VARCHAR(255) PRIMARY KEY,
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
    await db.query(
      'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING',
      [setting.key, setting.value]
    );
  }

  // Users (for dashboard access)
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(50) CHECK(role IN ('admin', 'staff', 'kitchen')) DEFAULT 'staff',
      name VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('[Database] PostgreSQL tables initialized successfully.');
}

/**
 * Checks if the menu is empty and seeds it automatically.
 */
async function checkAndAutoSeed(db) {
  try {
    const row = await db.get('SELECT COUNT(*) as count FROM menu_items');
    if (parseInt(row.count) === 0) {
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
