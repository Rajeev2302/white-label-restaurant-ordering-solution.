import React, { useState, useEffect, useMemo } from 'react';
import { 
  ClipboardList, 
  CheckSquare, 
  IndianRupee, 
  Clock, 
  Utensils, 
  ChefHat, 
  ArrowRight,
  Archive,
  AlertCircle,
  Search,
  Settings as SettingsIcon,
  Plus,
  Edit,
  Trash2,
  Download,
  CheckCircle2,
  X
} from 'lucide-react';

function App() {
  // Navigation
  const [activeTab, setActiveTab] = useState('orders'); // 'orders', 'menu', 'settings'

  // DB States
  const [orders, setOrders] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [settings, setSettings] = useState({
    restaurantName: 'Lakshmi Ganesh Restaurant',
    gstPercentage: 5.0,
    serviceChargePercentage: 2.5
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Search & Filter States for Orders
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [statusFilters, setStatusFilters] = useState({
    pending: true,
    preparing: true,
    ready: true,
    served: true
  });

  // Settings form states
  const [settingsForm, setSettingsForm] = useState({
    restaurantName: '',
    gstPercentage: '',
    serviceChargePercentage: ''
  });
  const [settingsStatus, setSettingsStatus] = useState({ success: false, message: '' });

  // Menu Management Modal/Form states
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  const [menuFormMode, setMenuFormMode] = useState('add'); // 'add' or 'edit'
  const [editingItemId, setEditingItemId] = useState(null);
  const [menuForm, setMenuForm] = useState({
    name: '',
    price: '',
    category: 'Veg Starters',
    subcategory: '',
    isVeg: true,
    isAvailable: true,
    imageUrl: ''
  });

  const categories = [
    'Veg Starters', 'Non Veg Starters', 'Tandoori Starters',
    'Veg Biryanis', 'Non Veg Biryanis', 'Veg Fried Rice', 'Non Veg Fried Rice',
    'Veg Curries', 'Non Veg Curries', 'Tandoori Rotis',
    'Egg', 'Prawns', 'Fish', 'Special Items',
    'Family Packs', 'Jumbo Packs', 'Party Packs',
    'Special Rice', 'Cool Drinks'
  ];

  // Fetch Database Data
  const fetchData = () => {
    setLoading(true);
    
    // Fetch Settings
    fetch('/api/settings')
      .then(res => res.json())
      .then(resJson => {
        if (resJson.success) {
          setSettings(resJson.data);
          setSettingsForm({
            restaurantName: resJson.data.restaurantName,
            gstPercentage: String(resJson.data.gstPercentage),
            serviceChargePercentage: String(resJson.data.serviceChargePercentage)
          });
        }
      })
      .catch(err => console.error('[Settings] Load error:', err));

    // Fetch Menu
    fetch('/api/menu')
      .then(res => res.json())
      .then(resJson => {
        if (resJson.success) {
          setMenuItems(resJson.data);
        }
      })
      .catch(err => console.error('[Menu] Load error:', err));

    // Fetch Orders
    fetch('/api/orders')
      .then(res => {
        if (!res.ok) throw new Error('Failed to load orders from backend');
        return res.json();
      })
      .then(resJson => {
        if (resJson.success) {
          setOrders(resJson.data);
          setError(null);
        } else {
          throw new Error(resJson.message || 'Unknown database retrieval error');
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('[Orders Load Error]', err);
        setError("Unable to fetch latest orders. Retrying automatically...");
        setLoading(false);
      });
  };

  // Poll orders only (faster refresh, keeping settings/menu manual)
  const fetchOrdersOnly = () => {
    fetch('/api/orders')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch orders');
        return res.json();
      })
      .then(resJson => {
        if (resJson.success) {
          setOrders(resJson.data);
          setError(null); // Clear error on success retry
        } else {
          throw new Error(resJson.message || 'Database error');
        }
      })
      .catch(err => {
        console.error('[Orders Poll Error]', err);
        setError("Unable to fetch latest orders. Retrying automatically...");
      });
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Poll interval setup
  useEffect(() => {
    if (!autoRefresh || activeTab !== 'orders') return;
    const interval = setInterval(fetchOrdersOnly, 7000);
    return () => clearInterval(interval);
  }, [autoRefresh, activeTab]);

  // Order status transition updates
  const handleUpdateStatus = (orderId, currentStatus) => {
    let nextStatus = '';
    if (currentStatus === 'pending') nextStatus = 'preparing';
    else if (currentStatus === 'preparing') nextStatus = 'ready';
    else if (currentStatus === 'ready') nextStatus = 'served';
    else return;

    fetch(`/api/orders/${orderId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus })
    })
    .then(res => {
      if (!res.ok) throw new Error('Failed to update order status');
      return res.json();
    })
    .then(data => {
      if (data.success) {
        fetchOrdersOnly();
      } else {
        alert(`Status update failed: ${data.message}`);
      }
    })
    .catch(err => {
      console.error('[Status Update Error]', err);
      alert("Unable to update order status. Please check your connection and try again.");
    });
  };

  // Settings Save
  const handleSaveSettings = (e) => {
    e.preventDefault();
    setSettingsStatus({ success: false, message: 'Saving...' });

    fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        restaurantName: settingsForm.restaurantName,
        gstPercentage: parseFloat(settingsForm.gstPercentage),
        serviceChargePercentage: parseFloat(settingsForm.serviceChargePercentage)
      })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        setSettingsStatus({ success: true, message: 'Settings saved successfully!' });
        setSettings({
          restaurantName: settingsForm.restaurantName,
          gstPercentage: parseFloat(settingsForm.gstPercentage),
          serviceChargePercentage: parseFloat(settingsForm.serviceChargePercentage)
        });
      } else {
        setSettingsStatus({ success: false, message: `Save failed: ${data.message}` });
      }
    })
    .catch(err => {
      console.error('[Settings Save Error]', err);
      setSettingsStatus({ success: false, message: "Unable to save configurations. Please try again." });
    });
  };

  // Menu Management CRUD Operations
  const handleMenuSubmit = (e) => {
    e.preventDefault();
    
    // Validate inputs
    if (!menuForm.name || menuForm.name.trim() === '') {
      alert('Menu item name is required');
      return;
    }
    const priceNum = parseFloat(menuForm.price);
    if (isNaN(priceNum) || priceNum <= 0) {
      alert('Valid price is required');
      return;
    }

    const payload = {
      name: menuForm.name,
      price: priceNum,
      category: menuForm.category,
      subcategory: menuForm.subcategory || menuForm.category,
      isVeg: menuForm.isVeg,
      isAvailable: menuForm.isAvailable,
      imageUrl: menuForm.imageUrl || null
    };

    const url = menuFormMode === 'add' ? '/api/menu' : `/api/menu/${editingItemId}`;
    const method = menuFormMode === 'add' ? 'POST' : 'PUT';

    fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    .then(res => {
      if (!res.ok) throw new Error('Failed to save menu item');
      return res.json();
    })
    .then(data => {
      if (data.success) {
        setIsMenuModalOpen(false);
        // Refresh menu list
        fetchData();
      } else {
        alert(`Failed to save menu item: ${data.message}`);
      }
    })
    .catch(err => {
      console.error('[Menu Save Error]', err);
      alert("Unable to save menu item. Please try again.");
    });
  };

  const handleEditMenuItem = (item) => {
    setMenuFormMode('edit');
    setEditingItemId(item.id);
    setMenuForm({
      name: item.name,
      price: String(item.price),
      category: item.category,
      subcategory: item.subcategory,
      isVeg: item.isVeg,
      isAvailable: item.isAvailable,
      imageUrl: item.imageUrl || ''
    });
    setIsMenuModalOpen(true);
  };

  const handleDeleteMenuItem = (itemId) => {
    if (!confirm('Are you sure you want to delete this menu item from SQLite database?')) return;

    fetch(`/api/menu/${itemId}`, { method: 'DELETE' })
      .then(res => {
        if (!res.ok) throw new Error('Failed to delete menu item');
        return res.json();
      })
      .then(data => {
        if (data.success) {
          fetchData();
        } else {
          alert(`Delete failed: ${data.message}`);
        }
      })
      .catch(err => {
        console.error('[Menu Delete Error]', err);
        alert("Unable to delete menu item. Please try again.");
      });
  };

  const handleToggleAvailability = (item) => {
    const updatedAvailable = !item.isAvailable;
    
    fetch(`/api/menu/${item.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: item.name,
        price: item.price,
        category: item.category,
        subcategory: item.subcategory,
        isVeg: item.isVeg,
        isAvailable: updatedAvailable,
        imageUrl: item.imageUrl || null
      })
    })
    .then(res => {
      if (!res.ok) throw new Error('Failed to update availability');
      return res.json();
    })
    .then(data => {
      if (data.success) {
        fetchData();
      } else {
        alert(`Failed to toggle status: ${data.message}`);
      }
    })
    .catch(err => {
      console.error('[Availability Toggle Error]', err);
      alert("Unable to update item availability. Please try again.");
    });
  };

  // Helper date checker
  const isToday = (dateString) => {
    if (!dateString) return false;
    const dateStrFormatted = dateString.includes(' ') && !dateString.includes('T')
      ? dateString.replace(' ', 'T') + 'Z' 
      : dateString;
    const date = new Date(dateStrFormatted);
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const dateStrFormatted = dateString.includes(' ') && !dateString.includes('T')
      ? dateString.replace(' ', 'T') + 'Z' 
      : dateString;
    const date = new Date(dateStrFormatted);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Metrics Calculations (Pure database logic filters)
  const todayOrders = useMemo(() => {
    return orders.filter(o => isToday(o.createdAt));
  }, [orders]);

  const activeOrders = useMemo(() => {
    return orders.filter(o => o.status === 'pending' || o.status === 'preparing' || o.status === 'ready');
  }, [orders]);

  const completedOrdersToday = useMemo(() => {
    return orders.filter(o => o.status === 'served' && isToday(o.updatedAt || o.createdAt));
  }, [orders]);

  const totalOrdersTodayCount = todayOrders.length;
  
  const todayRevenue = useMemo(() => {
    return completedOrdersToday.reduce((sum, curr) => sum + curr.totalAmount, 0);
  }, [completedOrdersToday]);

  const avgOrderValue = useMemo(() => {
    if (completedOrdersToday.length === 0) return 0;
    return parseFloat((todayRevenue / completedOrdersToday.length).toFixed(2));
  }, [todayRevenue, completedOrdersToday]);

  // Order filtration logic (search by ID, Table, and checkbox filters)
  const filteredActiveOrders = useMemo(() => {
    return activeOrders.filter(order => {
      // 1. Status Filter check
      if (order.status === 'pending' && !statusFilters.pending) return false;
      if (order.status === 'preparing' && !statusFilters.preparing) return false;
      if (order.status === 'ready' && !statusFilters.ready) return false;

      // 2. Search query check
      if (orderSearchQuery.trim() !== '') {
        const query = orderSearchQuery.toLowerCase().trim();
        const matchesId = String(order.id).includes(query);
        const matchesTable = String(order.tableNumber).includes(query);
        return matchesId || matchesTable;
      }
      return true;
    });
  }, [activeOrders, statusFilters, orderSearchQuery]);

  const filteredServedOrders = useMemo(() => {
    const served = orders.filter(o => o.status === 'served');
    return served.filter(order => {
      if (!statusFilters.served) return false;
      if (orderSearchQuery.trim() !== '') {
        const query = orderSearchQuery.toLowerCase().trim();
        const matchesId = String(order.id).includes(query);
        const matchesTable = String(order.tableNumber).includes(query);
        return matchesId || matchesTable;
      }
      return true;
    });
  }, [orders, statusFilters, orderSearchQuery]);

  // CSV Report Exporter
  const handleExportCSV = () => {
    const todayServed = orders.filter(o => o.status === 'served' && isToday(o.updatedAt || o.createdAt));
    
    if (todayServed.length === 0) {
      alert("No orders have been served today yet. Nothing to export.");
      return;
    }

    // CSV Headers
    let csvContent = "Order ID,Table Number,Items,Amount,Status,Created Time,Served Time\n";

    todayServed.forEach(order => {
      const itemsListStr = order.items.map(it => `${it.quantity}x ${it.name}`).join(' | ');
      const cleanItems = `"${itemsListStr.replace(/"/g, '""')}"`;
      
      const createdTime = order.createdAt;
      const servedTime = order.updatedAt || order.createdAt;
      
      csvContent += `${order.id},${order.tableNumber},${cleanItems},${order.totalAmount},${order.status},"${createdTime}","${servedTime}"\n`;
    });

    // Create virtual download anchor link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute("download", `LGR_Orders_Report_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="dashboard-layout">
      {/* 1. HEADER SECTION */}
      <header className="dashboard-header">
        <div className="header-brand">
          <img 
            src="https://res.cloudinary.com/dwatx4zlt/image/upload/v1782051849/Logo_copy_imxucw.jpg" 
            alt="Logo" 
            className="brand-logo"
          />
          <div>
            <h1 className="dashboard-title">{settings.restaurantName} Panel</h1>
            <p className="dashboard-subtitle">Kitchen & Operations System</p>
          </div>
        </div>

        {/* Tab navigation */}
        <nav className="dashboard-nav-tabs">
          <button 
            className={`nav-tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            <ClipboardList size={16} />
            <span>Orders Monitor</span>
          </button>
          <button 
            className={`nav-tab-btn ${activeTab === 'menu' ? 'active' : ''}`}
            onClick={() => setActiveTab('menu')}
          >
            <Utensils size={16} />
            <span>Menu Manager</span>
          </button>
          <button 
            className={`nav-tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <SettingsIcon size={16} />
            <span>Settings</span>
          </button>
        </nav>
      </header>

      {/* 2. VIEW: ORDERS MONITOR */}
      {activeTab === 'orders' && (
        <>
          {error && (
            <div className="dashboard-error-banner" style={{
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              color: '#ef4444',
              padding: '12px 20px',
              margin: '16px 20px 0 20px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}
          {/* ANALYTICS METRIC CARDS */}
          <section className="stats-row">
            <div className="stat-card">
              <div className="stat-icon-wrapper active-bg">
                <ClipboardList className="stat-icon" size={24} />
              </div>
              <div className="stat-info">
                <span className="stat-label">Total Orders Today</span>
                <span className="stat-value">{totalOrdersTodayCount}</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon-wrapper revenue-bg">
                <IndianRupee className="stat-icon" size={24} />
              </div>
              <div className="stat-info">
                <span className="stat-label">Today's Revenue</span>
                {todayRevenue === 0 ? (
                  <span className="stat-value-empty" style={{ fontSize: '13.5px', color: 'var(--text-muted)', fontWeight: '500', display: 'block', marginTop: '4px' }}>No sales recorded today.</span>
                ) : (
                  <span className="stat-value">₹{todayRevenue}</span>
                )}
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon-wrapper blue-bg">
                <ChefHat className="stat-icon" size={24} />
              </div>
              <div className="stat-info">
                <span className="stat-label">Active Orders</span>
                <span className="stat-value">{activeOrders.length}</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon-wrapper emerald-bg">
                <CheckSquare className="stat-icon" size={24} />
              </div>
              <div className="stat-info">
                <span className="stat-label">Avg Order Value</span>
                <span className="stat-value">₹{avgOrderValue}</span>
              </div>
            </div>
          </section>

          {/* SEARCH & FILTERS BAR */}
          <section className="search-filter-controls-row">
            <div className="search-box-container">
              <Search className="search-icon" size={18} />
              <input 
                type="text" 
                placeholder="Search orders by Table or ID..." 
                value={orderSearchQuery}
                onChange={(e) => setOrderSearchQuery(e.target.value)}
                className="search-input"
              />
              {orderSearchQuery && (
                <button className="clear-search-btn" onClick={() => setOrderSearchQuery('')}>
                  <X size={16} />
                </button>
              )}
            </div>

            <div className="status-filters-group">
              <span className="filter-group-label">Show Status:</span>
              
              <label className="filter-checkbox-label">
                <input 
                  type="checkbox" 
                  checked={statusFilters.pending}
                  onChange={(e) => setStatusFilters({ ...statusFilters, pending: e.target.checked })}
                />
                <span className="checkbox-custom pending"></span> Pending
              </label>

              <label className="filter-checkbox-label">
                <input 
                  type="checkbox" 
                  checked={statusFilters.preparing}
                  onChange={(e) => setStatusFilters({ ...statusFilters, preparing: e.target.checked })}
                />
                <span className="checkbox-custom preparing"></span> Preparing
              </label>

              <label className="filter-checkbox-label">
                <input 
                  type="checkbox" 
                  checked={statusFilters.ready}
                  onChange={(e) => setStatusFilters({ ...statusFilters, ready: e.target.checked })}
                />
                <span className="checkbox-custom ready"></span> Ready
              </label>

              <label className="filter-checkbox-label">
                <input 
                  type="checkbox" 
                  checked={statusFilters.served}
                  onChange={(e) => setStatusFilters({ ...statusFilters, served: e.target.checked })}
                />
                <span className="checkbox-custom served"></span> Served
              </label>
            </div>

            <button className="csv-export-btn" onClick={handleExportCSV}>
              <Download size={16} />
              <span>Export Today's Orders</span>
            </button>
          </section>

          {/* TWO COLUMN GRID LISTING */}
          <div className="dashboard-grid">
            {/* Live Kitchen Monitor */}
            <section className="dashboard-column active-orders-column">
              <div className="column-header">
                <ChefHat className="column-icon" size={20} />
                <h2>Live Kitchen Orders ({filteredActiveOrders.length})</h2>
              </div>

              {loading && orders.length === 0 ? (
                <div className="loader-box"><div className="spinner"></div></div>
              ) : filteredActiveOrders.length === 0 ? (
                <div className="empty-column-box" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', textAlign: 'center' }}>
                  <Utensils size={48} className="empty-icon" style={{ opacity: 0.3, marginBottom: '12px', color: 'var(--text-muted)' }} />
                  <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-muted)' }}>No active orders</h3>
                </div>
              ) : (
                <div className="orders-scroller">
                  {filteredActiveOrders.map(order => (
                    <div key={order.id} className={`order-card status-${order.status}`}>
                      <div className="order-card-header">
                        <div className="order-meta">
                          <span className="order-id">Order #000{order.id}</span>
                          <span className={`status-pill ${order.status}`}>{order.status.toUpperCase()}</span>
                        </div>
                        <div className="table-badge">Table {order.tableNumber}</div>
                      </div>

                      <div className="order-time-row">
                        <Clock size={14} className="time-icon" />
                        <span>Placed at {formatTime(order.createdAt)}</span>
                      </div>

                      <div className="order-divider"></div>

                      <ul className="order-items-list">
                        {order.items.map((item, idx) => (
                          <li key={idx} className="order-item-detail">
                            <span className="item-qty">{item.quantity}x</span>
                            <span className="item-name">{item.name}</span>
                            <span className="item-price">₹{item.price * item.quantity}</span>
                          </li>
                        ))}
                      </ul>

                      <div className="order-divider"></div>

                      <div className="order-card-footer">
                        <div className="order-total">
                          <span className="total-label">Total Amount</span>
                          <span className="total-val">₹{order.totalAmount}</span>
                        </div>

                        <div className="action-button-wrapper">
                          {order.status === 'pending' && (
                            <button 
                              className="status-btn pending-btn"
                              onClick={() => handleUpdateStatus(order.id, 'pending')}
                            >
                              <span>Start Cooking</span>
                              <ArrowRight size={14} />
                            </button>
                          )}
                          {order.status === 'preparing' && (
                            <button 
                              className="status-btn preparing-btn"
                              onClick={() => handleUpdateStatus(order.id, 'preparing')}
                            >
                              <span>Mark Ready</span>
                              <ArrowRight size={14} />
                            </button>
                          )}
                          {order.status === 'ready' && (
                            <button 
                              className="status-btn ready-btn"
                              onClick={() => handleUpdateStatus(order.id, 'ready')}
                            >
                              <span>Mark Served</span>
                              <CheckSquare size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Served History monitor */}
            <section className="dashboard-column served-orders-column">
              <div className="column-header">
                <Archive className="column-icon" size={20} />
                <h2>Served Orders History ({filteredServedOrders.length})</h2>
              </div>

              {filteredServedOrders.length === 0 ? (
                <div className="empty-column-box" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', textAlign: 'center' }}>
                  <Archive size={48} className="empty-icon" style={{ opacity: 0.3, marginBottom: '12px', color: 'var(--text-muted)' }} />
                  <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-muted)' }}>No completed orders today</h3>
                </div>
              ) : (
                <div className="orders-scroller">
                  {filteredServedOrders.map(order => (
                    <div key={order.id} className="history-card">
                      <div className="history-card-header">
                        <div>
                          <span className="history-order-id">Order #000{order.id}</span>
                          <div className="history-table">Table {order.tableNumber}</div>
                        </div>
                        <div className="history-amount">₹{order.totalAmount}</div>
                      </div>

                      <div className="history-items">
                        {order.items.map((item, idx) => (
                          <span key={idx} className="history-item-tag">
                            {item.quantity}x {item.name}
                          </span>
                        ))}
                      </div>

                      <div className="history-footer">
                        <Clock size={12} className="time-icon" />
                        <span>Served at {formatTime(order.updatedAt || order.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </>
      )}

      {/* 3. VIEW: MENU MANAGER */}
      {activeTab === 'menu' && (
        <section className="menu-manager-section">
          <div className="section-header-action">
            <h2>Menu Database Management ({menuItems.length} items)</h2>
            
            <button 
              className="add-new-item-btn"
              onClick={() => {
                setMenuFormMode('add');
                setMenuForm({
                  name: '',
                  price: '',
                  category: 'Veg Starters',
                  subcategory: '',
                  isVeg: true,
                  isAvailable: true,
                  imageUrl: ''
                });
                setIsMenuModalOpen(true);
              }}
            >
              <Plus size={16} />
              <span>Add New Menu Item</span>
            </button>
          </div>

          {menuItems.length === 0 ? (
            <div className="empty-menu-box" style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '60px 20px',
              textAlign: 'center',
              background: 'var(--bg-card)',
              border: '1px dashed var(--border-gold)',
              borderRadius: '12px',
              marginTop: '20px'
            }}>
              <Utensils size={48} style={{ opacity: 0.3, marginBottom: '12px', color: 'var(--gold-accent)' }} />
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-muted)' }}>No menu items available.</h3>
            </div>
          ) : (
            <div className="menu-items-table-container">
              <table className="menu-items-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Price</th>
                    <th>Category</th>
                    <th>Type</th>
                    <th>Availability</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {menuItems.map(item => (
                    <tr key={item.id} className={!item.isAvailable ? 'row-unavailable' : ''}>
                      <td className="item-name-cell">
                        <span className={`veg-icon-border ${item.isVeg ? 'veg-border' : 'non-veg-border'}`}>
                          <span className={`veg-icon-dot ${item.isVeg ? 'veg-fill' : 'non-veg-fill'}`}></span>
                        </span>
                        <span>{item.name}</span>
                      </td>
                      <td className="item-price-cell">₹{item.price}</td>
                      <td>
                        <span className="category-cell-tag">{item.category}</span>
                      </td>
                      <td>{item.isVeg ? 'Veg' : 'Non-Veg'}</td>
                      <td>
                        <button 
                          className={`availability-toggle-btn ${item.isAvailable ? 'available' : 'unavailable'}`}
                          onClick={() => handleToggleAvailability(item)}
                        >
                          {item.isAvailable ? 'Available' : 'Unavailable'}
                        </button>
                      </td>
                      <td>
                        <div className="table-actions">
                          <button 
                            className="table-action-btn edit-btn"
                            onClick={() => handleEditMenuItem(item)}
                          >
                            <Edit size={14} />
                          </button>
                          <button 
                            className="table-action-btn delete-btn"
                            onClick={() => handleDeleteMenuItem(item.id)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* 4. VIEW: RESTAURANT SETTINGS */}
      {activeTab === 'settings' && (
        <section className="settings-section">
          <h2>Restaurant Settings</h2>
          <p className="settings-desc">Configure taxes, charges, and branding. These parameters update the customer digital menu and tax receipts immediately.</p>

          <form onSubmit={handleSaveSettings} className="settings-form">
            <div className="form-group">
              <label>Restaurant Display Name</label>
              <input 
                type="text" 
                value={settingsForm.restaurantName}
                onChange={(e) => setSettingsForm({ ...settingsForm, restaurantName: e.target.value })}
                required
              />
            </div>

            <div className="form-group-row">
              <div className="form-group">
                <label>GST Percentage (%)</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={settingsForm.gstPercentage}
                  onChange={(e) => setSettingsForm({ ...settingsForm, gstPercentage: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Service Charge (%)</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={settingsForm.serviceChargePercentage}
                  onChange={(e) => setSettingsForm({ ...settingsForm, serviceChargePercentage: e.target.value })}
                  required
                />
              </div>
            </div>

            <button type="submit" className="save-settings-btn">
              Save Settings
            </button>

            {settingsStatus.message && (
              <div className={`form-feedback-banner ${settingsStatus.success ? 'success' : 'error'}`}>
                {settingsStatus.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>{settingsStatus.message}</span>
              </div>
            )}
          </form>
        </section>
      )}

      {/* 5. ADD / EDIT MENU MODAL POPUP */}
      {isMenuModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h2>{menuFormMode === 'add' ? 'Add New Menu Item' : 'Edit Menu Item'}</h2>
              <button className="close-modal-btn" onClick={() => setIsMenuModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleMenuSubmit} className="modal-form">
              <div className="form-group">
                <label>Dish Name</label>
                <input 
                  type="text" 
                  value={menuForm.name}
                  onChange={(e) => setMenuForm({ ...menuForm, name: e.target.value })}
                  placeholder="e.g. Special Chicken Manchurian"
                  required
                />
              </div>

              <div className="form-group">
                <label>Image URL (Optional)</label>
                <input 
                  type="url" 
                  value={menuForm.imageUrl}
                  onChange={(e) => setMenuForm({ ...menuForm, imageUrl: e.target.value })}
                  placeholder="e.g. https://images.unsplash.com/... or leave blank"
                />
              </div>

              <div className="form-group-row">
                <div className="form-group">
                  <label>Price (₹)</label>
                  <input 
                    type="number" 
                    value={menuForm.price}
                    onChange={(e) => setMenuForm({ ...menuForm, price: e.target.value })}
                    placeholder="e.g. 180"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Category</label>
                  <select 
                    value={menuForm.category}
                    onChange={(e) => setMenuForm({ ...menuForm, category: e.target.value, subcategory: e.target.value })}
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group-checkboxes">
                <label className="checkbox-form-label">
                  <input 
                    type="checkbox" 
                    checked={menuForm.isVeg}
                    onChange={(e) => setMenuForm({ ...menuForm, isVeg: e.target.checked })}
                  />
                  <span>Vegetarian Item</span>
                </label>

                <label className="checkbox-form-label">
                  <input 
                    type="checkbox" 
                    checked={menuForm.isAvailable}
                    onChange={(e) => setMenuForm({ ...menuForm, isAvailable: e.target.checked })}
                  />
                  <span>Mark as Available</span>
                </label>
              </div>

              <button type="submit" className="modal-submit-btn">
                {menuFormMode === 'add' ? 'Insert Item' : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
