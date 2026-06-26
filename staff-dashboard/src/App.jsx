import React, { useState, useEffect, useMemo } from 'react';
import { 
  ClipboardList, 
  CheckSquare, 
  IndianRupee, 
  Clock, 
  RotateCw, 
  Utensils, 
  ChefHat, 
  Archive,
  AlertCircle,
  Search,
  Settings as SettingsIcon,
  Plus,
  Edit,
  Trash2,
  Download,
  CheckCircle2,
  X,
  QrCode,
  TrendingUp,
  Info
} from 'lucide-react';
import QrGeneratorPage from '../../frontend/src/QrGeneratorPage';
import OrderHistoryPage from './OrderHistoryPage';

function App() {
  // Navigation
  const [activeTab, setActiveTab] = useState('orders'); // 'orders', 'menu', 'settings'
  const [kitchenTab, setKitchenTab] = useState('pending'); // 'pending', 'accepted', 'preparing', 'ready', 'served'
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);


  // DB States
  const [orders, setOrders] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [settings, setSettings] = useState({
    restaurantName: 'Lakshmi Ganesh Restaurant',
    logoUrl: 'https://res.cloudinary.com/dwatx4zlt/image/upload/v1782051849/Logo_copy_imxucw.jpg',
    phoneNumber: '',
    address: '',
    themeColor: '#d4af37',
    currencySymbol: '₹',
    tagline: 'Authentic Indian Flavors',
    gstPercentage: 5.0,
    serviceChargePercentage: 2.5
  });

  // Dynamic branding and SEO metadata effect
  useEffect(() => {
    if (settings.restaurantName) {
      document.title = `Staff Control Center | ${settings.restaurantName}`;
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        metaDesc.setAttribute('content', `Administration panel, table management, live kitchen monitor, and billing dashboard for ${settings.restaurantName}.`);
      }
    }
    if (settings.themeColor) {
      document.documentElement.style.setProperty('--accent-teal', settings.themeColor);
    }
  }, [settings.restaurantName, settings.themeColor]);
  
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

  // Search & Filter States for Menu Manager
  const [menuSearchQuery, setMenuSearchQuery] = useState('');
  const [menuVegFilter, setMenuVegFilter] = useState('all'); // 'all', 'veg', 'non-veg'
  const [menuCategoryFilter, setMenuCategoryFilter] = useState('all');

  // Settings form states
  const [settingsForm, setSettingsForm] = useState({
    restaurantName: '',
    logoUrl: '',
    phoneNumber: '',
    address: '',
    themeColor: '',
    currencySymbol: '',
    tagline: '',
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
            logoUrl: resJson.data.logoUrl || '',
            phoneNumber: resJson.data.phoneNumber || '',
            address: resJson.data.address || '',
            themeColor: resJson.data.themeColor || '',
            currencySymbol: resJson.data.currencySymbol || '',
            tagline: resJson.data.tagline || '',
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
    if (currentStatus === 'pending') nextStatus = 'accepted';
    else if (currentStatus === 'accepted') nextStatus = 'preparing';
    else if (currentStatus === 'preparing') nextStatus = 'ready';
    else if (currentStatus === 'ready') nextStatus = 'served';
    else return;

    fetch(`/api/orders/${orderId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus })
    })
    .then(async res => {
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to update order status');
      }
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
      alert(err.message || "Unable to update order status. Please check your connection and try again.");
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
        logoUrl: settingsForm.logoUrl,
        phoneNumber: settingsForm.phoneNumber,
        address: settingsForm.address,
        themeColor: settingsForm.themeColor,
        currencySymbol: settingsForm.currencySymbol,
        tagline: settingsForm.tagline,
        gstPercentage: parseFloat(settingsForm.gstPercentage || '0'),
        serviceChargePercentage: parseFloat(settingsForm.serviceChargePercentage || '0')
      })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        setSettingsStatus({ success: true, message: 'Settings saved successfully!' });
        setSettings({
          restaurantName: settingsForm.restaurantName,
          logoUrl: settingsForm.logoUrl,
          phoneNumber: settingsForm.phoneNumber,
          address: settingsForm.address,
          themeColor: settingsForm.themeColor,
          currencySymbol: settingsForm.currencySymbol,
          tagline: settingsForm.tagline,
          gstPercentage: parseFloat(settingsForm.gstPercentage || '0'),
          serviceChargePercentage: parseFloat(settingsForm.serviceChargePercentage || '0')
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
    .then(async res => {
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to save menu item');
      }
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
      alert(err.message || "Unable to save menu item. Please try again.");
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
      .then(async res => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || 'Failed to delete menu item');
        }
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
        alert(err.message || "Unable to delete menu item. Please try again.");
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

  const activeTablesCount = useMemo(() => {
    const activeStates = ['pending', 'accepted', 'preparing', 'ready'];
    const active = orders.filter(o => activeStates.includes(o.status));
    const uniqueTables = new Set(active.map(o => o.tableNumber));
    return uniqueTables.size;
  }, [orders]);

  const recentActivities = useMemo(() => {
    const activities = [];
    orders.forEach(order => {
      if (order.createdAt) {
        activities.push({
          id: `${order.id}-new`,
          orderId: order.id,
          tableNumber: order.tableNumber,
          type: 'new',
          label: 'New Order Placed',
          time: new Date(order.createdAt.replace(' ', 'T') + 'Z'),
          amount: order.totalAmount
        });
      }
      if (order.acceptedAt) {
        activities.push({
          id: `${order.id}-accepted`,
          orderId: order.id,
          tableNumber: order.tableNumber,
          type: 'accepted',
          label: 'Kitchen Accepted',
          time: new Date(order.acceptedAt.replace(' ', 'T') + 'Z')
        });
      }
      if (order.readyAt) {
        activities.push({
          id: `${order.id}-ready`,
          orderId: order.id,
          tableNumber: order.tableNumber,
          type: 'ready',
          label: 'Order Ready',
          time: new Date(order.readyAt.replace(' ', 'T') + 'Z')
        });
      }
      if (order.servedAt) {
        activities.push({
          id: `${order.id}-served`,
          orderId: order.id,
          tableNumber: order.tableNumber,
          type: 'served',
          label: 'Order Served',
          time: new Date(order.servedAt.replace(' ', 'T') + 'Z')
        });
      }
    });

    // Sort by time descending and take top 8
    return activities
      .sort((a, b) => b.time - a.time)
      .slice(0, 8);
  }, [orders]);

  const getRelativeTime = (date) => {
    const now = new Date();
    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / 60000);
    
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

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

  const filteredTabOrders = useMemo(() => {
    return orders.filter(order => {
      if (kitchenTab === 'served') {
        if (order.status !== 'served' || !isToday(order.updatedAt || order.createdAt)) return false;
      } else {
        if (order.status !== kitchenTab) return false;
      }

      if (orderSearchQuery.trim() !== '') {
        const query = orderSearchQuery.toLowerCase().trim();
        const matchesId = String(order.id).includes(query);
        const matchesTable = String(order.tableNumber).includes(query);
        return matchesId || matchesTable;
      }
      return true;
    });
  }, [orders, kitchenTab, orderSearchQuery]);

  const tabCounts = useMemo(() => {
    const counts = {
      pending: 0,
      accepted: 0,
      preparing: 0,
      ready: 0,
      served: 0
    };
    orders.forEach(o => {
      if (o.status === 'served') {
        if (isToday(o.updatedAt || o.createdAt)) {
          counts.served++;
        }
      } else if (counts[o.status] !== undefined) {
        counts[o.status]++;
      }
    });
    return counts;
  }, [orders]);


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

  const filteredMenuItems = useMemo(() => {
    return menuItems.filter(item => {
      // 1. Search Dish Name
      if (menuSearchQuery.trim() !== '') {
        const q = menuSearchQuery.toLowerCase().trim();
        if (!item.name.toLowerCase().includes(q)) return false;
      }
      
      // 2. Filter Veg / Non Veg
      if (menuVegFilter === 'veg' && !item.isVeg) return false;
      if (menuVegFilter === 'non-veg' && item.isVeg) return false;

      // 3. Filter Category
      if (menuCategoryFilter !== 'all' && item.category !== menuCategoryFilter) return false;

      return true;
    });
  }, [menuItems, menuSearchQuery, menuVegFilter, menuCategoryFilter]);

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
            src={settings.logoUrl || "https://res.cloudinary.com/dwatx4zlt/image/upload/v1782051849/Logo_copy_imxucw.jpg"} 
            alt="Logo" 
            className="brand-logo"
          />
          <div>
            <h1 className="dashboard-title">{settings.restaurantName} Admin</h1>
            <p className="dashboard-subtitle">Admin Control Center</p>
          </div>
        </div>

        {/* Tab navigation */}
        <nav className="dashboard-nav-tabs">
          <button 
            className={`nav-tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            <ClipboardList size={16} />
            <span>Orders Overview</span>
          </button>
          <button 
            className={`nav-tab-btn ${activeTab === 'menu' ? 'active' : ''}`}
            onClick={() => setActiveTab('menu')}
          >
            <Utensils size={16} />
            <span>Menu Manager</span>
          </button>
          <button 
            className={`nav-tab-btn ${activeTab === 'qr-generator' ? 'active' : ''}`}
            onClick={() => setActiveTab('qr-generator')}
          >
            <QrCode size={16} />
            <span>QR Generator</span>
          </button>
          <button 
            className={`nav-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <Archive size={16} />
            <span>Order History</span>
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
            <div className="dashboard-error-banner" style={{ margin: '0 20px 20px 20px' }}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}
          {/* ANALYTICS METRIC CARDS */}
          <section className="stats-row analytics-grid">
            {/* 1. Today's Revenue */}
            <div className="stat-card glass-card revenue-glow">
              <div className="stat-icon-wrapper revenue-bg">
                <IndianRupee className="stat-icon" size={24} />
              </div>
              <div className="stat-info">
                <span className="stat-label">Today's Revenue</span>
                <span className="stat-value">{settings.currencySymbol || '₹'}{todayRevenue}</span>
              </div>
            </div>

            {/* 2. Today's Orders */}
            <div className="stat-card glass-card orders-glow">
              <div className="stat-icon-wrapper active-bg">
                <ClipboardList className="stat-icon" size={24} />
              </div>
              <div className="stat-info">
                <span className="stat-label">Today's Orders</span>
                <span className="stat-value">{totalOrdersTodayCount}</span>
              </div>
            </div>

            {/* 3. Pending Orders */}
            <div className="stat-card glass-card pending-glow">
              <div className="stat-icon-wrapper amber-bg">
                <Clock className="stat-icon" size={24} />
              </div>
              <div className="stat-info">
                <span className="stat-label">Pending Orders</span>
                <span className="stat-value">{tabCounts.pending}</span>
              </div>
            </div>

            {/* 4. Orders Preparing */}
            <div className="stat-card glass-card preparing-glow">
              <div className="stat-icon-wrapper purple-bg">
                <ChefHat className="stat-icon" size={24} />
              </div>
              <div className="stat-info">
                <span className="stat-label">Orders Preparing</span>
                <span className="stat-value">{tabCounts.accepted + tabCounts.preparing}</span>
              </div>
            </div>

            {/* 5. Ready Orders */}
            <div className="stat-card glass-card ready-glow">
              <div className="stat-icon-wrapper teal-bg">
                <RotateCw className="stat-icon" size={24} />
              </div>
              <div className="stat-info">
                <span className="stat-label">Ready Orders</span>
                <span className="stat-value">{tabCounts.ready}</span>
              </div>
            </div>

            {/* 6. Active Tables */}
            <div className="stat-card glass-card tables-glow">
              <div className="stat-icon-wrapper blue-bg">
                <Utensils className="stat-icon" size={24} />
              </div>
              <div className="stat-info">
                <span className="stat-label">Active Tables</span>
                <span className="stat-value">{activeTablesCount}</span>
              </div>
            </div>

            {/* 7. Average Order Value */}
            <div className="stat-card glass-card aov-glow">
              <div className="stat-icon-wrapper orange-bg">
                <TrendingUp className="stat-icon" size={24} />
              </div>
              <div className="stat-info">
                <span className="stat-label">Avg Order Value</span>
                <span className="stat-value">{settings.currencySymbol || '₹'}{avgOrderValue}</span>
              </div>
            </div>
          </section>

          {/* SEARCH & FILTERS BAR */}
          <section className="search-filter-controls-row">
            <div className="search-box-container">
              <Search className="search-icon" size={18} />
              <input 
                type="text" 
                placeholder="Search by Table or Order ID..." 
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

          <div className="dashboard-content-row">
            <div className="workflow-column">
              {/* KITCHEN WORKFLOW TABS */}
              <div className="kitchen-workflow-tabs-container">
                <div className="kitchen-workflow-tabs">
                  <button 
                    className={`workflow-tab-btn ${kitchenTab === 'pending' ? 'active' : ''}`}
                    onClick={() => setKitchenTab('pending')}
                  >
                    <Clock size={16} />
                    <span>New</span>
                    <span className="tab-count-badge pending">{tabCounts.pending}</span>
                  </button>
                  <button 
                    className={`workflow-tab-btn ${kitchenTab === 'accepted' ? 'active' : ''}`}
                    onClick={() => setKitchenTab('accepted')}
                  >
                    <CheckSquare size={16} />
                    <span>Accepted</span>
                    <span className="tab-count-badge accepted">{tabCounts.accepted}</span>
                  </button>
                  <button 
                    className={`workflow-tab-btn ${kitchenTab === 'preparing' ? 'active' : ''}`}
                    onClick={() => setKitchenTab('preparing')}
                  >
                    <ChefHat size={16} />
                    <span>Preparing</span>
                    <span className="tab-count-badge preparing">{tabCounts.preparing}</span>
                  </button>
                  <button 
                    className={`workflow-tab-btn ${kitchenTab === 'ready' ? 'active' : ''}`}
                    onClick={() => setKitchenTab('ready')}
                  >
                    <RotateCw size={16} />
                    <span>Ready</span>
                    <span className="tab-count-badge ready">{tabCounts.ready}</span>
                  </button>
                  <button 
                    className={`workflow-tab-btn ${kitchenTab === 'served' ? 'active' : ''}`}
                    onClick={() => setKitchenTab('served')}
                  >
                    <CheckCircle2 size={16} />
                    <span>Served</span>
                    <span className="tab-count-badge served">{tabCounts.served}</span>
                  </button>
                </div>
              </div>

              {/* WORKFLOW ORDERS LISTING */}
              <div className="workflow-orders-container">
                {loading && orders.length === 0 ? (
                  <div className="loader-box"><div className="spinner"></div></div>
                ) : filteredTabOrders.length === 0 ? (
                  <div className="empty-tab-box" style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '80px 20px',
                    textAlign: 'center',
                    background: 'var(--bg-card)',
                    border: '1.5px dashed rgba(20, 184, 166, 0.15)',
                    borderRadius: '16px',
                    marginTop: '10px'
                  }}>
                    {/* Premium illustration container */}
                    <div className="empty-state-illustration" style={{
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '120px',
                      height: '120px',
                      margin: '0 auto 20px auto',
                    }}>
                      <div style={{
                        position: 'absolute',
                        width: '80px',
                        height: '80px',
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(20, 184, 166, 0.12) 0%, transparent 70%)',
                        filter: 'blur(8px)',
                      }}></div>
                      <div style={{
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '72px',
                        height: '72px',
                        borderRadius: '24px',
                        background: 'rgba(255, 255, 255, 0.01)',
                        border: '1px solid rgba(20, 184, 166, 0.25)',
                        boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.2)',
                      }}>
                        <ClipboardList size={32} style={{ color: 'var(--accent-teal)' }} />
                      </div>
                    </div>

                    <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-main)', margin: '0 0 8px 0' }}>
                      No active orders.
                    </h3>
                    
                    <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', maxWidth: '340px', margin: '0', lineHeight: '1.5' }}>
                      There are no customer tickets currently in this stage. Active workflow orders will appear here automatically.
                    </p>
                  </div>
                ) : (
                  <div className="workflow-orders-grid">
                    {filteredTabOrders.map(order => (
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
                          <span>
                            {order.status === 'pending' && `Placed at ${formatTime(order.createdAt)}`}
                            {order.status === 'accepted' && `Accepted at ${formatTime(order.updatedAt || order.createdAt)}`}
                            {order.status === 'preparing' && `Started cooking at ${formatTime(order.updatedAt || order.createdAt)}`}
                            {order.status === 'ready' && `Ready at ${formatTime(order.updatedAt || order.createdAt)}`}
                            {order.status === 'served' && `Served at ${formatTime(order.updatedAt || order.createdAt)}`}
                          </span>
                        </div>

                        <div className="order-divider"></div>

                        <ul className="order-items-list">
                          {order.items.map((item, idx) => (
                            <li key={idx} className="order-item-detail">
                              <span className="item-qty">{item.quantity}x</span>
                              <span className="item-name">{item.name}</span>
                              <span className="item-price">{settings.currencySymbol || '₹'}{item.price * item.quantity}</span>
                            </li>
                          ))}
                        </ul>

                        <div className="order-divider"></div>

                        <div className="order-card-footer">
                          <div className="order-total">
                            <span className="total-label">Total Amount</span>
                            <span className="total-val">{settings.currencySymbol || '₹'}{order.totalAmount}</span>
                          </div>

                          <div className="admin-status-display" style={{ display: 'flex', alignItems: 'center' }}>
                            <span className={`status-pill ${order.status}`}>{order.status.toUpperCase()}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* RECENT ACTIVITY SIDEBAR */}
            <div className="activity-sidebar glass-card activity-panel">
              <div className="activity-header">
                <Clock size={16} className="activity-header-icon" />
                <h3>Recent Activity</h3>
              </div>

              <div className="activity-timeline">
                <div className="timeline-connector"></div>
                {recentActivities.length === 0 ? (
                  <p className="empty-activity-text">No system activity logged yet.</p>
                ) : (
                  recentActivities.map(act => (
                    <div key={act.id} className="activity-item">
                      {/* Event Dot */}
                      <div className={`activity-dot ${act.type}`}></div>
                      
                      {/* Event Info */}
                      <div className="activity-content">
                        <div className="activity-row">
                          <span className="activity-label">{act.label}</span>
                          <span className="activity-time">{getRelativeTime(act.time)}</span>
                        </div>
                        <span className="activity-sub">
                          Order #000{act.orderId} (Table {act.tableNumber})
                          {act.amount !== undefined && ` • ${settings.currencySymbol || '₹'}{act.amount}`}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
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
              padding: '80px 20px',
              textAlign: 'center',
              background: 'var(--bg-card)',
              border: '1.5px dashed rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              marginTop: '20px'
            }}>
              {/* Premium illustration container */}
              <div className="empty-state-illustration" style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '120px',
                height: '120px',
                margin: '0 auto 20px auto',
              }}>
                <div style={{
                  position: 'absolute',
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(212, 175, 55, 0.1) 0%, transparent 70%)',
                  filter: 'blur(8px)',
                }}></div>
                <div style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '72px',
                  height: '72px',
                  borderRadius: '24px',
                  background: 'rgba(255, 255, 255, 0.01)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.2)',
                }}>
                  <Utensils size={32} style={{ color: 'var(--accent-teal, #d4af37)' }} />
                </div>
              </div>

              <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-main)', margin: '0 0 8px 0' }}>
                No menu items available
              </h3>
              
              <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', maxWidth: '340px', margin: '0', lineHeight: '1.5' }}>
                Your menu database is currently empty. Click the 'Add New Menu Item' button above to insert your first dish.
              </p>
            </div>
          ) : (
            <>
              {/* Search & Filter Controls Bar */}
              <div className="menu-filters-bar" style={{
                background: 'rgba(255, 255, 255, 0.01)',
                border: '1px solid rgba(255, 255, 255, 0.03)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
                alignItems: 'end',
                marginBottom: '20px'
              }}>
                {/* Search Dish Name */}
                <div className="filter-item" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Search Dish Name</label>
                  <div className="search-box-container" style={{ width: '100%', maxWidth: 'none', background: 'rgba(255, 255, 255, 0.02)' }}>
                    <Search className="search-icon" size={14} />
                    <input 
                      type="text" 
                      placeholder="e.g. Paneer Butter Masala..."
                      value={menuSearchQuery}
                      onChange={e => setMenuSearchQuery(e.target.value)}
                      className="search-input"
                      style={{ fontSize: '13px' }}
                    />
                  </div>
                </div>

                {/* Filter Category */}
                <div className="filter-item" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Filter Category</label>
                  <div className="search-box-container" style={{ width: '100%', maxWidth: 'none', background: 'rgba(255, 255, 255, 0.02)', padding: '2px 10px' }}>
                    <Utensils size={14} style={{ color: 'var(--text-muted)', marginRight: '8px' }} />
                    <select 
                      value={menuCategoryFilter}
                      onChange={e => setMenuCategoryFilter(e.target.value)}
                      className="search-input"
                      style={{ fontSize: '13px', background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-main)', width: '100%', colorScheme: 'dark' }}
                    >
                      <option value="all" style={{ background: '#1c1c1e' }}>All Categories</option>
                      {categories.map(cat => (
                        <option key={cat} value={cat} style={{ background: '#1c1c1e' }}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Filter Veg/Non Veg */}
                <div className="filter-item" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Dietary Type</label>
                  <div className="search-box-container" style={{ width: '100%', maxWidth: 'none', background: 'rgba(255, 255, 255, 0.02)', padding: '2px 10px' }}>
                    <Info size={14} style={{ color: 'var(--text-muted)', marginRight: '8px' }} />
                    <select 
                      value={menuVegFilter}
                      onChange={e => setMenuVegFilter(e.target.value)}
                      className="search-input"
                      style={{ fontSize: '13px', background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-main)', width: '100%', colorScheme: 'dark' }}
                    >
                      <option value="all" style={{ background: '#1c1c1e' }}>All Types</option>
                      <option value="veg" style={{ background: '#1c1c1e' }}>Veg Only</option>
                      <option value="non-veg" style={{ background: '#1c1c1e' }}>Non-Veg Only</option>
                    </select>
                  </div>
                </div>

                {/* Reset Filters */}
                {(menuSearchQuery || menuVegFilter !== 'all' || menuCategoryFilter !== 'all') && (
                  <button 
                    onClick={() => {
                      setMenuSearchQuery('');
                      setMenuVegFilter('all');
                      setMenuCategoryFilter('all');
                    }}
                    style={{
                      height: '42px',
                      background: 'rgba(239, 68, 68, 0.08)',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      color: 'var(--accent-rose)',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      fontFamily: 'var(--font-title)',
                      fontWeight: '600',
                      fontSize: '13px',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <span>Reset Filters</span>
                  </button>
                )}
              </div>

              {filteredMenuItems.length === 0 ? (
                <div className="empty-menu-box" style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '80px 20px',
                  textAlign: 'center',
                  background: 'var(--bg-card)',
                  border: '1.5px dashed rgba(255, 255, 255, 0.08)',
                  borderRadius: '16px',
                  marginTop: '10px'
                }}>
                  <div className="empty-state-illustration" style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '120px',
                    height: '120px',
                    margin: '0 auto 20px auto',
                  }}>
                    <div style={{
                      position: 'absolute',
                      width: '80px',
                      height: '80px',
                      borderRadius: '50%',
                      background: 'radial-gradient(circle, rgba(212, 175, 55, 0.1) 0%, transparent 70%)',
                      filter: 'blur(8px)',
                    }}></div>
                    <div style={{
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '72px',
                      height: '72px',
                      borderRadius: '24px',
                      background: 'rgba(255, 255, 255, 0.01)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.2)',
                    }}>
                      <Search size={32} style={{ color: 'var(--accent-teal, #d4af37)' }} />
                    </div>
                  </div>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-main)', margin: '0 0 8px 0' }}>
                    No matching dishes found
                  </h3>
                  <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', maxWidth: '340px', margin: '0', lineHeight: '1.5' }}>
                    Try adjusting your search keywords or type/category filters to find the dish.
                  </p>
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
                      {filteredMenuItems.map(item => (
                        <tr key={item.id} className={!item.isAvailable ? 'row-unavailable' : ''}>
                          <td className="item-name-cell">
                            <span className={`veg-icon-border ${item.isVeg ? 'veg-border' : 'non-veg-border'}`}>
                              <span className={`veg-icon-dot ${item.isVeg ? 'veg-fill' : 'non-veg-fill'}`}></span>
                            </span>
                            <span>{item.name}</span>
                          </td>
                          <td className="item-price-cell">{settings.currencySymbol || '₹'}{item.price}</td>
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
            </>
          )}
        </section>
      )}

      {/* 4. VIEW: QR GENERATOR */}
      {activeTab === 'qr-generator' && (
        <section className="qr-generator-section">
          <QrGeneratorPage 
            settings={settings} 
            setCurrentPath={(path) => {
              setActiveTab('settings');
            }} 
          />
        </section>
      )}

      {/* 5. VIEW: ORDER HISTORY */}
      {activeTab === 'history' && (
        <OrderHistoryPage settings={settings} />
      )}

      {/* 6. VIEW: RESTAURANT SETTINGS */}
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

            <div className="form-group">
              <label>Logo URL</label>
              <input 
                type="url" 
                value={settingsForm.logoUrl}
                onChange={(e) => setSettingsForm({ ...settingsForm, logoUrl: e.target.value })}
                placeholder="e.g. https://domain.com/logo.jpg"
              />
            </div>

            <div className="form-group">
              <label>Tagline</label>
              <input 
                type="text" 
                value={settingsForm.tagline}
                onChange={(e) => setSettingsForm({ ...settingsForm, tagline: e.target.value })}
                placeholder="e.g. Authentic Indian Flavors"
              />
            </div>

            <div className="form-group">
              <label>Address</label>
              <input 
                type="text" 
                value={settingsForm.address}
                onChange={(e) => setSettingsForm({ ...settingsForm, address: e.target.value })}
                placeholder="e.g. H.No. 12-34, Main Road, Hyderabad"
              />
            </div>

            <div className="form-group-row">
              <div className="form-group">
                <label>Phone Number</label>
                <input 
                  type="text" 
                  value={settingsForm.phoneNumber}
                  onChange={(e) => setSettingsForm({ ...settingsForm, phoneNumber: e.target.value })}
                  placeholder="e.g. +91 98765 43210"
                />
              </div>

              <div className="form-group">
                <label>Currency Symbol</label>
                <input 
                  type="text" 
                  value={settingsForm.currencySymbol}
                  onChange={(e) => setSettingsForm({ ...settingsForm, currencySymbol: e.target.value })}
                  placeholder="e.g. ₹ or $"
                  maxLength={5}
                />
              </div>
            </div>

            <div className="form-group-row">
              <div className="form-group">
                <label>Theme Color (Hex)</label>
                <input 
                  type="text" 
                  value={settingsForm.themeColor}
                  onChange={(e) => setSettingsForm({ ...settingsForm, themeColor: e.target.value })}
                  placeholder="e.g. #d4af37"
                />
              </div>

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
            </div>

            <div className="form-group-row">
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
