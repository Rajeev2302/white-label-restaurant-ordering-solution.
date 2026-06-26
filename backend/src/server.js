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
app.get('/api/settings', async (_req, res, next) => {
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
        logoUrl: config.logo_url || 'https://res.cloudinary.com/dwatx4zlt/image/upload/v1782051849/Logo_copy_imxucw.jpg',
        phoneNumber: config.phone_number || '',
        address: config.address || '',
        themeColor: config.theme_color || '#d4af37',
        currencySymbol: config.currency_symbol || '₹',
        tagline: config.tagline || '',
        gstPercentage: config.gst_percentage !== undefined ? parseFloat(config.gst_percentage) : 0.0,
        serviceChargePercentage: config.service_charge_percentage !== undefined ? parseFloat(config.service_charge_percentage) : 0.0
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
    const { 
      restaurantName, 
      logoUrl, 
      phoneNumber, 
      address, 
      themeColor, 
      currencySymbol, 
      tagline, 
      gstPercentage, 
      serviceChargePercentage 
    } = req.body;

    if (!restaurantName || restaurantName.trim() === '') {
      const error = new Error('Restaurant Name is required');
      error.statusCode = 400;
      return next(error);
    }

    const cleanGst = gstPercentage === undefined || gstPercentage === '' ? 0.0 : parseFloat(gstPercentage);
    if (isNaN(cleanGst) || cleanGst < 0) {
      const error = new Error('GST percentage must be a valid positive number');
      error.statusCode = 400;
      return next(error);
    }

    const cleanServiceCharge = serviceChargePercentage === undefined || serviceChargePercentage === '' ? 0.0 : parseFloat(serviceChargePercentage);
    if (isNaN(cleanServiceCharge) || cleanServiceCharge < 0) {
      const error = new Error('Service Charge percentage must be a valid positive number');
      error.statusCode = 400;
      return next(error);
    }

    const db = await getDbConnection();

    await db.run('BEGIN TRANSACTION');
    try {
      await db.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('restaurant_name', ?)", [restaurantName.trim()]);
      await db.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('logo_url', ?)", [(logoUrl || '').trim()]);
      await db.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('phone_number', ?)", [(phoneNumber || '').trim()]);
      await db.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('address', ?)", [(address || '').trim()]);
      await db.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('theme_color', ?)", [(themeColor || '#d4af37').trim()]);
      await db.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('currency_symbol', ?)", [(currencySymbol || '₹').trim()]);
      await db.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('tagline', ?)", [(tagline || '').trim()]);
      await db.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('gst_percentage', ?)", [String(cleanGst)]);
      await db.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('service_charge_percentage', ?)", [String(cleanServiceCharge)]);
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
 * GET /api/backup
 * Exports settings, menu items, and tables as JSON.
 */
app.get('/api/backup', async (_req, res, next) => {
  try {
    const db = await getDbConnection();
    const settings = await db.all('SELECT * FROM settings');
    const menuItems = await db.all('SELECT * FROM menu_items');
    const tables = await db.all('SELECT * FROM tables');

    res.json({
      success: true,
      backup: {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        settings,
        menuItems,
        tables
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/restore
 * Restores settings, menu items, and tables from JSON.
 */
app.post('/api/restore', async (req, res, next) => {
  try {
    const { backup } = req.body;
    if (!backup || !backup.settings || !backup.menuItems) {
      const error = new Error('Invalid backup format. Backup must contain settings and menuItems.');
      error.statusCode = 400;
      return next(error);
    }

    const db = await getDbConnection();
    await db.run('BEGIN TRANSACTION');

    try {
      // Clear existing configuration tables
      await db.run('DELETE FROM settings');
      await db.run('DELETE FROM menu_items');
      await db.run('DELETE FROM tables');

      // Restore settings
      if (Array.isArray(backup.settings)) {
        const stmt = await db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
        for (const s of backup.settings) {
          if (s.key && s.value !== undefined) {
            await stmt.run(s.key, s.value);
          }
        }
        await stmt.finalize();
      }

      // Restore menu items
      if (Array.isArray(backup.menuItems)) {
        const stmt = await db.prepare(
          `INSERT INTO menu_items (id, name, price, category, subcategory, is_veg, is_available, image_url, created_at, updated_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        );
        for (const item of backup.menuItems) {
          await stmt.run(
            item.id || null,
            item.name,
            item.price,
            item.category,
            item.subcategory || item.category,
            item.is_veg !== undefined ? item.is_veg : (item.isVeg ? 1 : 0),
            item.is_available !== undefined ? item.is_available : (item.isAvailable ? 1 : 1),
            item.image_url || item.imageUrl || null,
            item.created_at || new Date().toISOString(),
            item.updated_at || new Date().toISOString()
          );
        }
        await stmt.finalize();
      }

      // Restore tables if present
      if (Array.isArray(backup.tables)) {
        const stmt = await db.prepare('INSERT OR IGNORE INTO tables (id, table_number, created_at) VALUES (?, ?, ?)');
        for (const t of backup.tables) {
          if (t.table_number) {
            await stmt.run(t.id || null, String(t.table_number).trim(), t.created_at || new Date().toISOString());
          }
        }
        await stmt.finalize();
      }

      await db.run('COMMIT');
      res.json({
        success: true,
        message: 'Database restored successfully'
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
app.get('/api/menu', async (_req, res, next) => {
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

    // Check if item is referenced in any order_items
    const referenced = await db.get('SELECT 1 FROM order_items WHERE menu_item_id = ? LIMIT 1', [id]);
    if (referenced) {
      const error = new Error('Cannot delete menu item because it is referenced in existing orders.');
      error.statusCode = 409; // Conflict
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

      for (const item of items) {
        if (!item.id || !item.quantity || !item.price) {
          throw new Error('Invalid order item data');
        }
        await insertItemStmt.run(orderId, item.id, item.quantity, item.price);
      }

      await insertItemStmt.finalize();
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
 */
app.get('/api/orders', async (_req, res, next) => {
  try {
    const db = await getDbConnection();
    const orders = await db.all('SELECT * FROM orders ORDER BY created_at DESC');
    
    const formattedOrders = [];
    for (const order of orders) {
      const items = await db.all(
        `SELECT oi.quantity, oi.price, mi.name as menu_item_name 
         FROM order_items oi 
         LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id 
         WHERE oi.order_id = ?`,
        [order.id]
      );
      
      formattedOrders.push({
        id: order.id,
        tableNumber: order.table_number,
        totalAmount: order.total_amount,
        status: order.status,
        paymentStatus: order.payment_status || 'Unpaid',
        createdAt: order.created_at,
        acceptedAt: order.accepted_at,
        readyAt: order.ready_at,
        servedAt: order.served_at,
        updatedAt: order.updated_at,
        items: items.map(it => ({
          name: it.menu_item_name || 'Deleted Menu Item',
          quantity: it.quantity,
          price: it.price
        }))
      });
    }

    res.json({
      success: true,
      data: formattedOrders
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/orders/:id
 * Returns details and status of a single order.
 */
app.get('/api/orders/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const db = await getDbConnection();
    const order = await db.get('SELECT * FROM orders WHERE id = ?', [id]);
    
    if (!order) {
      const error = new Error('Order not found');
      error.statusCode = 404;
      return next(error);
    }
    
    const items = await db.all(
      `SELECT oi.quantity, oi.price, mi.name as menu_item_name 
       FROM order_items oi 
       LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id 
       WHERE oi.order_id = ?`,
      [order.id]
    );

    res.json({
      success: true,
      data: {
        id: order.id,
        tableNumber: order.table_number,
        totalAmount: order.total_amount,
        status: order.status,
        paymentStatus: order.payment_status || 'Unpaid',
        createdAt: order.created_at,
        acceptedAt: order.accepted_at,
        readyAt: order.ready_at,
        servedAt: order.served_at,
        updatedAt: order.updated_at,
        items: items.map(it => ({
          name: it.menu_item_name || 'Deleted Menu Item',
          quantity: it.quantity,
          price: it.price
        }))
      }
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

    const validStatuses = ['pending', 'accepted', 'preparing', 'ready', 'served', 'completed', 'cancelled'];
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

    let query = 'UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP';
    const params = [status];

    if (status === 'accepted') {
      query += ', accepted_at = CURRENT_TIMESTAMP';
    } else if (status === 'ready') {
      query += ', ready_at = CURRENT_TIMESTAMP';
    } else if (status === 'served') {
      query += ', served_at = CURRENT_TIMESTAMP';
    }

    query += ' WHERE id = ?';
    params.push(id);

    await db.run(query, params);

    res.json({
      success: true,
      message: `Order status updated to ${status} successfully`
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/orders/:id/payment
 * Updates the payment status of an order.
 */
app.put('/api/orders/:id/payment', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { paymentStatus } = req.body;

    if (!paymentStatus || (paymentStatus !== 'Paid' && paymentStatus !== 'Unpaid')) {
      const error = new Error('Invalid or missing payment status');
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
      'UPDATE orders SET payment_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [paymentStatus, id]
    );

    res.json({
      success: true,
      message: `Order payment status updated to ${paymentStatus} successfully`
    });
  } catch (error) {
    next(error);
  }
});

// Health Check API
app.get('/api/health', async (_req, res, next) => {
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

async function startServer() {
  try {
    await getDbConnection();
    
    app.listen(PORT, () => {
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

startServer();
