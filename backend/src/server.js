import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { getDbConnection } from './config/db.js';
import { errorHandler } from './middleware/errorHandler.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware setup
app.use(morgan('dev'));

// CORS configuration
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',')
  : ['http://localhost:5173', 'http://localhost:5174'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- API ENDPOINTS ---

/**
 * GET /api/settings
 * Retrieves all configuration settings.
 */
app.get('/api/settings', async (req, res, next) => {
  try {
    const db = await getDbConnection();
    const rows = await db.all('SELECT * FROM settings');
    
    // Convert array of key-value rows to a single config object
    const config = {};
    rows.forEach(r => {
      config[r.key] = r.value;
    });

    res.json({
      success: true,
      data: {
        restaurantName: config.restaurant_name || 'Lakshmi Ganesh Restaurant',
        gstPercentage: parseFloat(config.gst_percentage || '5.0'),
        serviceChargePercentage: parseFloat(config.service_charge_percentage || '2.5')
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/settings
 * Updates configuration settings in SQLite.
 */
app.put('/api/settings', async (req, res, next) => {
  try {
    const { restaurantName, gstPercentage, serviceChargePercentage } = req.body;

    if (!restaurantName || restaurantName.trim() === '') {
      const error = new Error('Restaurant Name is required');
      error.statusCode = 400;
      return next(error);
    }

    if (gstPercentage === undefined || isNaN(gstPercentage) || gstPercentage < 0) {
      const error = new Error('GST percentage must be a valid positive number');
      error.statusCode = 400;
      return next(error);
    }

    if (serviceChargePercentage === undefined || isNaN(serviceChargePercentage) || serviceChargePercentage < 0) {
      const error = new Error('Service Charge percentage must be a valid positive number');
      error.statusCode = 400;
      return next(error);
    }

    const db = await getDbConnection();

    await db.run('BEGIN TRANSACTION');
    try {
      await db.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('restaurant_name', ?)", [restaurantName.trim()]);
      await db.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('gst_percentage', ?)", [String(gstPercentage)]);
      await db.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('service_charge_percentage', ?)", [String(serviceChargePercentage)]);
      await db.run('COMMIT');

      res.json({
        success: true,
        message: 'Settings updated successfully'
      });
    } catch (txErr) {
      await db.run('ROLLBACK');
      throw txErr;
    }
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/menu
 * Exposes all menu items, including availability status.
 */
app.get('/api/menu', async (req, res, next) => {
  try {
    const db = await getDbConnection();
    const items = await db.all('SELECT * FROM menu_items ORDER BY category ASC, name ASC');
    
    const formattedItems = items.map(item => ({
      id: item.id,
      name: item.name,
      price: item.price,
      category: item.category,
      subcategory: item.subcategory || item.category,
      isVeg: item.is_veg === 1,
      isAvailable: item.is_available === 1,
      imageUrl: item.image_url
    }));

    res.json({
      success: true,
      data: formattedItems
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/menu
 * Adds a new item to the menu.
 */
app.post('/api/menu', async (req, res, next) => {
  try {
    const { name, price, category, subcategory, isVeg, isAvailable, imageUrl } = req.body;

    if (!name || name.trim() === '') {
      const error = new Error('Item name is required');
      error.statusCode = 400;
      return next(error);
    }
    if (price === undefined || isNaN(price) || price <= 0) {
      const error = new Error('Price must be a valid positive number');
      error.statusCode = 400;
      return next(error);
    }
    if (!category || category.trim() === '') {
      const error = new Error('Category is required');
      error.statusCode = 400;
      return next(error);
    }

    const db = await getDbConnection();

    const result = await db.run(
      `INSERT INTO menu_items (name, price, category, subcategory, is_veg, is_available, image_url) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        name.trim(),
        parseFloat(price),
        category.trim(),
        subcategory ? subcategory.trim() : category.trim(),
        isVeg ? 1 : 0,
        isAvailable !== false ? 1 : 0,
        imageUrl && imageUrl.trim() !== '' ? imageUrl.trim() : null
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Menu item created successfully',
      id: result.lastID
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/menu/:id
 * Edits an existing menu item.
 */
app.put('/api/menu/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, price, category, subcategory, isVeg, isAvailable, imageUrl } = req.body;

    if (!name || name.trim() === '') {
      const error = new Error('Item name is required');
      error.statusCode = 400;
      return next(error);
    }
    if (price === undefined || isNaN(price) || price <= 0) {
      const error = new Error('Price must be a valid positive number');
      error.statusCode = 400;
      return next(error);
    }
    if (!category || category.trim() === '') {
      const error = new Error('Category is required');
      error.statusCode = 400;
      return next(error);
    }

    const db = await getDbConnection();

    // Check if item exists
    const item = await db.get('SELECT * FROM menu_items WHERE id = ?', [id]);
    if (!item) {
      const error = new Error('Menu item not found');
      error.statusCode = 404;
      return next(error);
    }

    await db.run(
      `UPDATE menu_items 
       SET name = ?, price = ?, category = ?, subcategory = ?, is_veg = ?, is_available = ?, image_url = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [
        name.trim(),
        parseFloat(price),
        category.trim(),
        subcategory ? subcategory.trim() : category.trim(),
        isVeg ? 1 : 0,
        isAvailable ? 1 : 0,
        imageUrl && imageUrl.trim() !== '' ? imageUrl.trim() : null,
        id
      ]
    );

    res.json({
      success: true,
      message: 'Menu item updated successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/menu/:id
 * Deletes a menu item.
 */
app.delete('/api/menu/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const db = await getDbConnection();

    // Check if item exists
    const item = await db.get('SELECT * FROM menu_items WHERE id = ?', [id]);
    if (!item) {
      const error = new Error('Menu item not found');
      error.statusCode = 404;
      return next(error);
    }

    await db.run('DELETE FROM menu_items WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Menu item deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tables
 * Saves a table number.
 */
app.post('/api/tables', async (req, res, next) => {
  try {
    const { table_number } = req.body;
    
    if (!table_number) {
      const error = new Error('Table number is required');
      error.statusCode = 400;
      return next(error);
    }

    const db = await getDbConnection();
    
    await db.run(
      'INSERT OR IGNORE INTO tables (table_number) VALUES (?)',
      [String(table_number).trim()]
    );

    res.json({
      success: true,
      message: `Table ${table_number} validated/registered successfully`
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/orders
 * Creates a new order. Includes duplicate order safety.
 */
app.post('/api/orders', async (req, res, next) => {
  try {
    const { table_number, items, total_amount } = req.body;

    if (!table_number) {
      const error = new Error('Table number is required');
      error.statusCode = 400;
      return next(error);
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      const error = new Error('Order must contain at least one item');
      error.statusCode = 400;
      return next(error);
    }

    if (total_amount === undefined || total_amount < 0) {
      const error = new Error('Valid total amount is required');
      error.statusCode = 400;
      return next(error);
    }

    const db = await getDbConnection();

    // --- DUPLICATE SAFETY CHECK ---
    // Prevent same table from placing the exact same order total within 15 seconds
    const duplicateWindowSec = 15;
    const potentialDuplicate = await db.get(
      `SELECT * FROM orders 
       WHERE table_number = ? 
         AND total_amount = ? 
         AND status = 'pending' 
         AND (strftime('%s', 'now') - strftime('%s', created_at)) < ?`,
      [String(table_number).trim(), Number(total_amount), duplicateWindowSec]
    );

    if (potentialDuplicate) {
      const error = new Error('Duplicate order suspected. Please wait a few seconds before ordering again.');
      error.statusCode = 409; // Conflict
      return next(error);
    }

    // Use a transaction
    await db.run('BEGIN TRANSACTION');

    try {
      await db.run(
        'INSERT OR IGNORE INTO tables (table_number) VALUES (?)',
        [String(table_number).trim()]
      );

      const orderResult = await db.run(
        'INSERT INTO orders (table_number, total_amount, status) VALUES (?, ?, ?)',
        [String(table_number).trim(), Number(total_amount), 'pending']
      );
      
      const orderId = orderResult.lastID;

      const insertItemStmt = await db.prepare(
        'INSERT INTO order_items (order_id, menu_item_id, quantity, price) VALUES (?, ?, ?, ?)'
      );

      try {
        for (const item of items) {
          if (!item.id || !item.quantity || !item.price) {
            throw new Error('Invalid order item data');
          }
          await insertItemStmt.run(orderId, item.id, item.quantity, item.price);
        }
      } finally {
        await insertItemStmt.finalize();
      }

      await db.run('COMMIT');

      // Fetch precise creation time for success receipt
      const createdOrder = await db.get('SELECT created_at FROM orders WHERE id = ?', [orderId]);

      res.status(201).json({
        success: true,
        message: 'Order placed successfully',
        orderId: orderId,
        createdAt: createdOrder.created_at
      });
    } catch (txError) {
      await db.run('ROLLBACK');
      throw txError;
    }

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/orders
 * Returns all active and served orders.
 * Optimized using a single SQL join to resolve the N+1 query problem.
 */
app.get('/api/orders', async (req, res, next) => {
  try {
    const db = await getDbConnection();
    
    // Execute a single join query to fetch all orders along with their items
    const rows = await db.all(`
      SELECT 
        o.id as order_id, 
        o.table_number, 
        o.total_amount, 
        o.status, 
        o.created_at as order_created_at, 
        o.updated_at as order_updated_at,
        oi.quantity, 
        oi.price, 
        mi.name as menu_item_name
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
      ORDER BY o.created_at DESC
    `);
    
    // Group items by order_id
    const ordersMap = new Map();
    for (const row of rows) {
      if (!ordersMap.has(row.order_id)) {
        ordersMap.set(row.order_id, {
          id: row.order_id,
          tableNumber: row.table_number,
          totalAmount: row.total_amount,
          status: row.status,
          createdAt: row.order_created_at,
          updatedAt: row.order_updated_at,
          items: []
        });
      }
      
      if (row.quantity !== null && row.quantity !== undefined) {
        ordersMap.get(row.order_id).items.push({
          name: row.menu_item_name || 'Deleted Menu Item',
          quantity: row.quantity,
          price: row.price
        });
      }
    }
    
    const formattedOrders = Array.from(ordersMap.values());

    res.json({
      success: true,
      data: formattedOrders
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/orders/:id/status
 * Updates the status of an order.
 */
app.put('/api/orders/:id/status', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'preparing', 'ready', 'served', 'completed', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      const error = new Error('Invalid or missing order status');
      error.statusCode = 400;
      return next(error);
    }

    const db = await getDbConnection();
    
    const order = await db.get('SELECT * FROM orders WHERE id = ?', [id]);
    if (!order) {
      const error = new Error('Order not found');
      error.statusCode = 404;
      return next(error);
    }

    await db.run(
      'UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, id]
    );

    res.json({
      success: true,
      message: `Order status updated to ${status} successfully`
    });
  } catch (error) {
    next(error);
  }
});

// Health Check API
app.get('/api/health', async (req, res, next) => {
  try {
    const db = await getDbConnection();
    await db.get('SELECT 1');
    
    res.status(200).json({
      success: true,
      message: 'Lakshmi Ganesh Restaurant Backend is healthy!',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        server: 'up'
      }
    });
  } catch (error) {
    next(error);
  }
});

app.use((req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
});

app.use(errorHandler);

let serverInstance = null;

async function startServer() {
  try {
    await getDbConnection();
    
    serverInstance = app.listen(PORT, () => {
      console.log(`==================================================`);
      console.log(`🚀 Lakshmi Ganesh Restaurant API server is running`);
      console.log(`📡 Port: ${PORT}`);
      console.log(`🌍 Env:  ${process.env.NODE_ENV || 'development'}`);
      console.log(`==================================================`);
    });
  } catch (err) {
    console.error('❌ Failed to start the server:', err);
    process.exit(1);
  }
}

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  console.log(`\n[Server] Received ${signal}. Shutting down gracefully...`);
  if (serverInstance) {
    serverInstance.close(() => {
      console.log('[Server] HTTP server closed.');
    });
  }
  try {
    const db = await getDbConnection();
    await db.close();
    console.log('[Database] SQLite connection closed.');
    process.exit(0);
  } catch (err) {
    console.error('[Server] Error during database shutdown:', err);
    process.exit(1);
  }
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

startServer();
