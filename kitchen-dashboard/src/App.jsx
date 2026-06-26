import React, { useState, useEffect, useMemo } from 'react';
import { 
  ChefHat, 
  Search, 
  RotateCw, 
  Clock, 
  CheckSquare, 
  CheckCircle2, 
  ArrowRight, 
  AlertCircle 
} from 'lucide-react';

const API_BASE_URL = import.meta.env.DEV ? '' : 'https://serveqr-api.onrender.com';

function App() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [kitchenTab, setKitchenTab] = useState('pending'); // 'pending', 'accepted', 'preparing', 'ready', 'served'
  const [orderSearchQuery, setOrderSearchQuery] = useState('');

  const [settings, setSettings] = useState({
    restaurantName: 'Lakshmi Ganesh Restaurant',
    logoUrl: '',
    themeColor: '#14b8a6',
    currencySymbol: '₹'
  });

  // Fetch Settings & Initial Orders
  useEffect(() => {
    // Settings load
    fetch(API_BASE_URL + '/api/settings')
      .then(res => res.json())
      .then(resJson => {
        if (resJson.success) {
          setSettings(resJson.data);
        }
      })
      .catch(err => console.error('[Kitchen settings load error]:', err));

    fetchOrders();
  }, []);

  // Dynamic branding and title effect
  useEffect(() => {
    if (settings.restaurantName) {
      document.title = `Kitchen Display System | ${settings.restaurantName}`;
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        metaDesc.setAttribute('content', `Dedicated Kitchen Display System for preparing orders, status tracking, and fulfillment monitor for ${settings.restaurantName}.`);
      }
    }
    if (settings.themeColor) {
      document.documentElement.style.setProperty('--accent-teal', settings.themeColor);
    }
  }, [settings.restaurantName, settings.themeColor]);

  // Fetch Orders
  const fetchOrders = () => {
    fetch(API_BASE_URL + '/api/orders')
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
        console.error('[Kitchen Orders Load Error]', err);
        setError("Unable to fetch latest orders. Retrying automatically...");
        setLoading(false);
      });
  };

  // Poll orders only every 5 seconds
  useEffect(() => {
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, []);

  // Update status transitions
  const handleUpdateStatus = (orderId, currentStatus) => {
    let nextStatus = '';
    if (currentStatus === 'pending') nextStatus = 'accepted';
    else if (currentStatus === 'accepted') nextStatus = 'preparing';
    else if (currentStatus === 'preparing') nextStatus = 'ready';
    else if (currentStatus === 'ready') nextStatus = 'served';
    else return;

    fetch(`${API_BASE_URL}/api/orders/${orderId}/status`, {
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
        fetchOrders();
      } else {
        alert(`Status update failed: ${data.message}`);
      }
    })
    .catch(err => {
      console.error('[Status Update Error]', err);
      alert(err.message || "Unable to update order status. Please check your connection and try again.");
    });
  };

  // Date helper check
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

  // Filtered orders listing
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

  // Tab counts
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

  return (
    <div className="kitchen-dashboard-container">
      {/* 1. KITCHEN HEADER */}
      <header className="kitchen-header">
        <div className="kitchen-brand">
          <ChefHat size={28} className="kitchen-header-icon" />
          <div>
            <h1 className="kitchen-title">{settings.restaurantName} Kitchen</h1>
            <p className="kitchen-subtitle">Live Kitchen Operations Display</p>
          </div>
        </div>

        <div className="kitchen-header-right">
          <div className="search-box-container kitchen-search">
            <Search className="search-icon" size={16} />
            <input 
              type="text" 
              placeholder="Search by Table or Order ID..." 
              value={orderSearchQuery}
              onChange={(e) => setOrderSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
          <button className="refresh-kitchen-btn" onClick={fetchOrders}>
            <RotateCw size={16} />
            <span>Refresh</span>
          </button>
        </div>
      </header>

      {/* 2. ERROR BANNER */}
      {error && (
        <div className="dashboard-error-banner" style={{ margin: '0 0 20px 0' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* 3. HORIZONTAL WORKFLOW TABS */}
      <div className="kitchen-workflow-tabs-container">
        <div className="kitchen-workflow-tabs">
          <button 
            className={`workflow-tab-btn ${kitchenTab === 'pending' ? 'active' : ''}`}
            onClick={() => setKitchenTab('pending')}
          >
            <Clock size={16} />
            <span>New Orders</span>
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

      {/* 4. ORDERS GRID */}
      <div className="workflow-orders-container">
        {loading && orders.length === 0 ? (
          <div className="loader-box"><div className="spinner"></div></div>
        ) : filteredTabOrders.length === 0 ? (
          <div className="empty-tab-box kitchen-empty" style={{
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
                <ChefHat size={32} style={{ color: 'var(--accent-teal)' }} />
              </div>
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-main)', margin: '0 0 8px 0' }}>
              Kitchen is all caught up.
            </h3>
            
            <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', maxWidth: '340px', margin: '0', lineHeight: '1.5' }}>
              Great job! All orders in this category have been prepared and served. New customer tickets will stream here automatically.
            </p>
          </div>
        ) : (
          <div className="workflow-orders-grid kitchen-grid">
            {filteredTabOrders.map(order => (
              <div key={order.id} className={`order-card kitchen-card status-${order.status}`}>
                <div className="order-card-header kitchen-card-header">
                  <div className="order-meta">
                    <span className="order-id">ID: #000{order.id}</span>
                    <span className={`status-pill ${order.status}`}>{order.status.toUpperCase()}</span>
                  </div>
                  <div className="table-badge kitchen-table-badge">Table {order.tableNumber}</div>
                </div>

                <div className="order-time-row">
                  <Clock size={14} className="time-icon" />
                  <span>
                    {order.status === 'pending' && `Placed at ${formatTime(order.createdAt)}`}
                    {order.status === 'accepted' && `Accepted at ${formatTime(order.updatedAt || order.createdAt)}`}
                    {order.status === 'preparing' && `Cooking started at ${formatTime(order.updatedAt || order.createdAt)}`}
                    {order.status === 'ready' && `Ready at ${formatTime(order.updatedAt || order.createdAt)}`}
                    {order.status === 'served' && `Served at ${formatTime(order.updatedAt || order.createdAt)}`}
                  </span>
                </div>

                <div className="order-divider"></div>

                <ul className="order-items-list kitchen-items-list">
                  {order.items.map((item, idx) => (
                    <li key={idx} className="order-item-detail kitchen-item-detail">
                      <span className="item-qty">{item.quantity}x</span>
                      <span className="item-name">{item.name}</span>
                    </li>
                  ))}
                </ul>

                <div className="order-divider"></div>

                <div className="order-card-footer kitchen-card-footer">
                  <div className="order-total">
                    <span className="total-label">Total</span>
                    <span className="total-val">{settings.currencySymbol || '₹'}{order.totalAmount}</span>
                  </div>

                  <div className="action-button-wrapper kitchen-action-wrapper">
                    {order.status === 'pending' && (
                      <button 
                        className="status-btn pending-btn kitchen-touch-btn"
                        onClick={() => handleUpdateStatus(order.id, 'pending')}
                      >
                        <span>Accept Order</span>
                        <ArrowRight size={18} />
                      </button>
                    )}
                    {order.status === 'accepted' && (
                      <button 
                        className="status-btn accepted-btn kitchen-touch-btn"
                        onClick={() => handleUpdateStatus(order.id, 'accepted')}
                      >
                        <span>Start Cooking</span>
                        <ArrowRight size={18} />
                      </button>
                    )}
                    {order.status === 'preparing' && (
                      <button 
                        className="status-btn preparing-btn kitchen-touch-btn"
                        onClick={() => handleUpdateStatus(order.id, 'preparing')}
                      >
                        <span>Mark Ready</span>
                        <ArrowRight size={18} />
                      </button>
                    )}
                    {order.status === 'ready' && (
                      <button 
                        className="status-btn ready-btn kitchen-touch-btn"
                        onClick={() => handleUpdateStatus(order.id, 'ready')}
                      >
                        <span>Mark Served</span>
                        <CheckSquare size={18} />
                      </button>
                    )}
                    {order.status === 'served' && (
                      <div className="served-complete-label kitchen-completed-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-emerald)', fontSize: '14px', fontWeight: '600' }}>
                        <CheckCircle2 size={18} />
                        <span>Completed</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
