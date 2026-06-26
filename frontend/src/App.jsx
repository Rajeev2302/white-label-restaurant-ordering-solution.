import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  AlertTriangle, 
  CheckCircle, 
  UtensilsCrossed, 
  X,
  Info,
  Receipt,
  ChefHat,
  ArrowRight
} from 'lucide-react';
import QrGeneratorPage from './QrGeneratorPage';


const API_BASE_URL = import.meta.env.DEV ? '' : 'https://serveqr-api.onrender.com';

function App() {
  // State variables
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Restaurant Settings
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

  // Dynamic styling and metadata effect
  useEffect(() => {
    if (settings.restaurantName) {
      document.title = `${settings.restaurantName} | QR Order & Dine`;
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        metaDesc.setAttribute('content', `Welcome to ${settings.restaurantName}. Scan the QR code on your table to view our delicious menu, place your order, and pay instantly.`);
      }
    }
    if (settings.themeColor) {
      document.documentElement.style.setProperty('--gold-accent', settings.themeColor);
      const hex = settings.themeColor.replace('#', '');
      if (hex.length === 6) {
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        document.documentElement.style.setProperty('--gold-accent-rgb', `${r}, ${g}, ${b}`);
      }
    }
  }, [settings.restaurantName, settings.themeColor]);

  // Table identifier
  const [tableNumber, setTableNumber] = useState(null);

  // SPA Routing Path
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('Veg Starters'); // Default category
  const [vegFilter, setVegFilter] = useState('all'); // 'all', 'veg', 'non-veg'
  
  // Shopping Cart state: { [itemId]: { ...item, quantity: N } }
  const [cart, setCart] = useState(() => {
    const savedCart = localStorage.getItem('lgr_cart');
    return savedCart ? JSON.parse(savedCart) : {};
  });
  
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [latestOrder, setLatestOrder] = useState(null); // Stores full latest order details for receipt
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const [activeOrderId, setActiveOrderId] = useState(() => {
    return localStorage.getItem('lgr_latest_order_id') || null;
  });
  const [activeOrderStatus, setActiveOrderStatus] = useState('pending');

  const [isSetupAuthenticated, setIsSetupAuthenticated] = useState(() => {
    return sessionStorage.getItem('lgr_setup_auth') === 'true';
  });

  // Polling for active order status
  useEffect(() => {
    if (!activeOrderId) return;

    const pollStatus = () => {
      fetch(`${API_BASE_URL}/api/orders/${activeOrderId}`)
        .then(res => {
          if (!res.ok) throw new Error('Order not found');
          return res.json();
        })
        .then(resJson => {
          if (resJson.success) {
            const order = resJson.data;
            setActiveOrderStatus(order.status);
            
            // If the latestOrder details aren't populated (e.g. after refresh), populate them
            if (!latestOrder) {
              setLatestOrder({
                orderId: order.id,
                tableNumber: order.tableNumber,
                items: order.items,
                subtotal: order.totalAmount,
                gst: 0,
                grandTotal: order.totalAmount,
                time: new Date(order.createdAt.replace(' ', 'T') + 'Z').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              });
            }
          }
        })
        .catch(err => {
          console.error('[Polling Error]', err);
          if (err.message === 'Order not found') {
            setActiveOrderId(null);
            localStorage.removeItem('lgr_latest_order_id');
          }
        });
    };

    // Run immediately
    pollStatus();

    // Setup interval
    const interval = setInterval(pollStatus, 4000);
    return () => clearInterval(interval);
  }, [activeOrderId, latestOrder]);

  // Sync order-status route parameters with active order ID
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderIdParam = params.get('id') || params.get('orderId');
    
    if (currentPath.startsWith('/order-status')) {
      if (orderIdParam) {
        if (orderIdParam !== String(activeOrderId)) {
          setActiveOrderId(orderIdParam);
        }
      } else if (activeOrderId) {
        window.history.replaceState({}, '', `/order-status?id=${activeOrderId}`);
      } else {
        setCurrentPath('/');
        window.history.replaceState({}, '', '/');
      }
    }
  }, [currentPath, activeOrderId]);

  // Sync cart to localStorage
  useEffect(() => {
    localStorage.setItem('lgr_cart', JSON.stringify(cart));
  }, [cart]);


  // Extract table parameter from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tableParam = params.get('table');
    if (tableParam) {
      const sanitizedTable = tableParam.trim();
      setTableNumber(sanitizedTable);
      
      // Save table registration on backend
      fetch(API_BASE_URL + '/api/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table_number: sanitizedTable })
      })
      .then(res => res.json())
      .catch(err => console.error('[Backend] Table registration error:', err));
    }
  }, []);

  // Fetch Settings & Menu from API
  useEffect(() => {
    // 1. Fetch settings
    fetch(API_BASE_URL + '/api/settings')
      .then(res => res.json())
      .then(resJson => {
        if (resJson.success) {
          setSettings(resJson.data);
        }
      })
      .catch(err => console.error('[Settings] Load failed:', err));

    // 2. Fetch menu
    fetch(API_BASE_URL + '/api/menu')
      .then(res => {
        if (!res.ok) throw new Error('Failed to load restaurant menu');
        return res.json();
      })
      .then(resJson => {
        if (resJson.success) {
          setMenuItems(resJson.data);
        } else {
          throw new Error(resJson.message || 'Unknown database retrieval error');
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('[Menu Load Error]', err);
        setError("Unable to load today's menu. Please refresh the page.");
        setLoading(false);
      });
  }, []);

  // Fixed categories list exactly as requested
  const categories = [
    'Veg Starters',
    'Non Veg Starters',
    'Tandoori Starters',
    'Veg Biryanis',
    'Non Veg Biryanis',
    'Veg Fried Rice',
    'Non Veg Fried Rice',
    'Veg Curries',
    'Non Veg Curries',
    'Tandoori Rotis',
    'Egg',
    'Prawns',
    'Fish',
    'Special Items',
    'Family Packs',
    'Jumbo Packs',
    'Party Packs',
    'Special Rice',
    'Cool Drinks'
  ];

  // Filter & Search computation
  const filteredMenuItems = useMemo(() => {
    return menuItems.filter(item => {
      // 1. Filter by category
      if (item.category !== activeCategory) return false;
      
      // 2. Filter by Veg/Non-Veg
      if (vegFilter === 'veg' && !item.isVeg) return false;
      if (vegFilter === 'non-veg' && item.isVeg) return false;
      
      // 3. Filter by search query
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(query);
        const matchesSubcategory = item.subcategory.toLowerCase().includes(query);
        return matchesName || matchesSubcategory;
      }
      
      return true;
    });
  }, [menuItems, activeCategory, vegFilter, searchQuery]);

  // Cart operations
  const addToCart = (item) => {
    if (!item.isAvailable) return; // Cannot add unavailable items
    setCart(prevCart => {
      const existing = prevCart[item.id];
      return {
        ...prevCart,
        [item.id]: {
          ...item,
          quantity: existing ? existing.quantity + 1 : 1
        }
      };
    });
  };

  const updateQuantity = (itemId, change) => {
    setCart(prevCart => {
      const item = prevCart[itemId];
      if (!item) return prevCart;
      
      const newQty = item.quantity + change;
      if (newQty <= 0) {
        const copy = { ...prevCart };
        delete copy[itemId];
        return copy;
      }
      
      return {
        ...prevCart,
        [itemId]: {
          ...item,
          quantity: newQty
        }
      };
    });
  };

  const removeFromCart = (itemId) => {
    setCart(prevCart => {
      const copy = { ...prevCart };
      delete copy[itemId];
      return copy;
    });
  };

  const clearCart = () => {
    setCart({});
  };

  // Cart Stats
  const cartItemsArray = Object.values(cart);
  const cartCount = cartItemsArray.reduce((acc, curr) => acc + curr.quantity, 0);
  
  // Math Calculations (Subtotal, GST, Service Charge, Grand Total)
  const cartSubtotal = cartItemsArray.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);
  const gstAmount = parseFloat((cartSubtotal * settings.gstPercentage / 100).toFixed(2));
  const serviceChargeAmount = parseFloat((cartSubtotal * settings.serviceChargePercentage / 100).toFixed(2));
  const cartGrandTotal = parseFloat((cartSubtotal + gstAmount + serviceChargeAmount).toFixed(2));

  // Handle Checkout / Place Order
  const handlePlaceOrder = () => {
    if (checkoutLoading) return;
    if (!tableNumber) {
      alert('Please scan a QR code table parameter to place your order.');
      return;
    }
    if (cartItemsArray.length === 0) return;

    setCheckoutLoading(true);

    const orderPayload = {
      table_number: tableNumber,
      items: cartItemsArray.map(item => ({
        id: item.id,
        price: item.price,
        quantity: item.quantity
      })),
      total_amount: cartGrandTotal
    };

    fetch(API_BASE_URL + '/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(orderPayload)
    })
    .then(async res => {
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status >= 500) {
          throw new Error('SERVER_UNAVAILABLE');
        }
        throw new Error(data.message || 'ORDER_FAILED');
      }
      return res.json();
    })
    .then(data => {
      if (data.success) {
        const orderId = data.orderId;
        
        // Save order receipt details for the success overlay
        const orderDetails = {
          orderId: orderId,
          tableNumber: tableNumber,
          items: cartItemsArray.map(item => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price
          })),
          subtotal: cartSubtotal,
          gst: gstAmount,
          serviceCharge: serviceChargeAmount,
          grandTotal: cartGrandTotal,
          time: data.createdAt ? new Date(data.createdAt.replace(' ', 'T') + 'Z').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        
        setLatestOrder(orderDetails);
        localStorage.setItem('lgr_latest_order_id', orderId);
        setActiveOrderId(orderId);
        setActiveOrderStatus('pending');
        
        // Reset states
        clearCart();
        setIsCartOpen(false);
        setShowSuccessOverlay(false);

        // Redirect to Order Status page
        setCurrentPath('/order-status');
        window.history.pushState({}, '', `/order-status?id=${orderId}`);
      }
      setCheckoutLoading(false);
    })
    .catch(err => {
      console.error('[Order Placement Error]', err);
      
      let userFriendlyMessage = '';
      if (!navigator.onLine) {
        userFriendlyMessage = "Unable to place your order. Please check your internet connection and try again.";
      } else if (err.message === 'SERVER_UNAVAILABLE' || err.name === 'TypeError' || err.message.toLowerCase().includes('fetch')) {
        userFriendlyMessage = "Our restaurant system is temporarily unavailable. Please contact the waiter.";
      } else {
        userFriendlyMessage = err.message || "Our restaurant system is temporarily unavailable. Please contact the waiter.";
      }
      
      alert(userFriendlyMessage);
      setCheckoutLoading(false);
    });
  };

  if (currentPath === '/setup' || currentPath === '/setup/qr') {
    if (!isSetupAuthenticated) {
      return (
        <SetupLoginPage 
          onLoginSuccess={() => setIsSetupAuthenticated(true)} 
          settings={settings} 
          setCurrentPath={setCurrentPath} 
        />
      );
    }
  }

  if (currentPath === '/setup') {
    return (
      <SetupPage 
        settings={settings} 
        setSettings={setSettings} 
        setCurrentPath={setCurrentPath} 
        onLogout={() => {
          setIsSetupAuthenticated(false);
          sessionStorage.removeItem('lgr_setup_auth');
          setCurrentPath('/');
          window.history.pushState({}, '', '/');
        }}
      />
    );
  }

  if (currentPath === '/setup/qr') {
    return (
      <QrGeneratorPage 
        settings={settings} 
        setCurrentPath={setCurrentPath} 
        onLogout={() => {
          setIsSetupAuthenticated(false);
          sessionStorage.removeItem('lgr_setup_auth');
          setCurrentPath('/');
          window.history.pushState({}, '', '/');
        }}
      />
    );
  }

  if (currentPath.startsWith('/order-status')) {
    return (
      <OrderStatusPage 
        settings={settings}
        setCurrentPath={setCurrentPath}
        activeOrderId={activeOrderId}
        setActiveOrderId={setActiveOrderId}
        activeOrderStatus={activeOrderStatus}
        setActiveOrderStatus={setActiveOrderStatus}
        latestOrder={latestOrder}
        setLatestOrder={setLatestOrder}
      />
    );
  }


  return (
    <div className="menu-app">
      {/* 1. HEADER BRANDING */}
      <header className="app-header">
        <div className="header-top">
          <div className="brand-logo-name">
            <img 
              src={settings.logoUrl || "https://res.cloudinary.com/dwatx4zlt/image/upload/v1782051849/Logo_copy_imxucw.jpg"} 
              alt={`${settings.restaurantName} Logo`} 
              className="brand-logo"
            />
            <div>
              <h1 className="brand-name">{settings.restaurantName}</h1>
              <p className="brand-tagline">{settings.tagline || 'Authentic Flavors'}</p>
            </div>
          </div>
          
          <button 
            className="cart-toggle-btn"
            onClick={() => setIsCartOpen(true)}
            aria-label="Open Shopping Cart"
          >
            <ShoppingCart size={22} />
            {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          </button>
        </div>

        {/* Table Identification Banner */}
        <div className={`table-banner ${tableNumber ? 'identified' : 'unidentified'}`}>
          <div className="table-banner-content">
            <UtensilsCrossed size={16} />
            {tableNumber ? (
              <span>You are ordering for <strong>Table {tableNumber}</strong></span>
            ) : (
              <span>Table not identified</span>
            )}
          </div>
          {!tableNumber && (
            <div className="table-warn-tooltip">
              <Info size={12} />
              <span>Ordering is disabled. Please scan table QR code.</span>
            </div>
          )}
        </div>
      </header>

      <div className="main-content">
        {/* 2. SEARCH & VEG FILTER */}
        <section className="search-filter-section">
          <div className="search-box-container">
            <Search className="search-icon" size={18} />
            <input 
              type="text" 
              placeholder="Search delicious dishes..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            {searchQuery && (
              <button className="clear-search-btn" onClick={() => setSearchQuery('')}>
                <X size={16} />
              </button>
            )}
          </div>

          <div className="veg-filter-group">
            <button 
              className={`filter-btn all ${vegFilter === 'all' ? 'active' : ''}`}
              onClick={() => setVegFilter('all')}
            >
              All
            </button>
            <button 
              className={`filter-btn veg ${vegFilter === 'veg' ? 'active' : ''}`}
              onClick={() => setVegFilter('veg')}
            >
              <span className="dot veg-dot"></span> Veg Only
            </button>
            <button 
              className={`filter-btn non-veg ${vegFilter === 'non-veg' ? 'active' : ''}`}
              onClick={() => setVegFilter('non-veg')}
            >
              <span className="dot non-veg-dot"></span> Non-Veg
            </button>
          </div>
        </section>

        {/* 3. CATEGORY TABS */}
        <nav className="category-tabs-container">
          <div className="category-tabs">
            {categories.map(cat => (
              <button
                key={cat}
                className={`category-tab ${activeCategory === cat ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </nav>

        {/* 4. DISH LISTING */}
        <section className="menu-list-section">
          {loading ? (
            <div className="loading-spinner-box">
              <div className="spinner"></div>
              <p>Fetching hot menu items...</p>
            </div>
          ) : error ? (
            <div className="error-box">
              <AlertTriangle className="error-icon" size={32} />
              <p>{error}</p>
              <button className="retry-btn" onClick={() => window.location.reload()}>Retry</button>
            </div>
          ) : filteredMenuItems.length === 0 ? (
            <div className="no-items-box" style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '60px 20px',
              textAlign: 'center',
              background: 'rgba(255, 255, 255, 0.01)',
              border: '1.5px dashed rgba(var(--gold-accent-rgb, 212, 175, 55), 0.15)',
              borderRadius: 'var(--radius-lg)',
              marginTop: '10px'
            }}>
              {/* Premium illustration container */}
              <div className="empty-state-illustration" style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100px',
                height: '100px',
                margin: '0 auto 16px auto',
              }}>
                <div style={{
                  position: 'absolute',
                  width: '70px',
                  height: '70px',
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(var(--gold-accent-rgb, 212, 175, 55), 0.12) 0%, transparent 70%)',
                  filter: 'blur(6px)',
                }}></div>
                <div style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '60px',
                  height: '60px',
                  borderRadius: '20px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(var(--gold-accent-rgb, 212, 175, 55), 0.2)',
                  boxShadow: 'inset 0 4px 10px rgba(0,0,0,0.15)',
                }}>
                  {searchQuery || vegFilter !== 'all' ? (
                    <Search size={26} style={{ color: 'var(--gold-accent)' }} />
                  ) : (
                    <UtensilsCrossed size={26} style={{ color: 'var(--gold-accent)' }} />
                  )}
                </div>
              </div>
              
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-main)', margin: '0 0 6px 0' }}>
                {searchQuery || vegFilter !== 'all' ? 'No matching dishes found' : 'No menu items available'}
              </h3>
              
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '280px', margin: '0 0 16px 0', lineHeight: '1.4' }}>
                {searchQuery || vegFilter !== 'all' 
                  ? "We couldn't find anything matching your search. Try resetting filters or searching for something else." 
                  : "Our chefs are updating the digital kitchen menu. Please check back in a moment or ask your server."}
              </p>

              {(searchQuery || vegFilter !== 'all') && (
                <button 
                  className="reset-filters-btn"
                  onClick={() => {
                    setSearchQuery('');
                    setVegFilter('all');
                  }}
                  style={{
                    background: 'rgba(var(--gold-accent-rgb, 212, 175, 55), 0.08)',
                    border: '1px solid rgba(var(--gold-accent-rgb, 212, 175, 55), 0.25)',
                    color: 'var(--gold-accent)',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  Reset Filters
                </button>
              )}
            </div>
          ) : (
            <div className="menu-grid">
              {filteredMenuItems.map(item => {
                const cartItem = cart[item.id];
                return (
                  <div key={item.id} className={`menu-card ${!item.isAvailable ? 'unavailable-card' : ''}`}>
                    <div className="menu-card-details">
                      <div className="veg-indicator-box">
                        <span className={`veg-icon-border ${item.isVeg ? 'veg-border' : 'non-veg-border'}`}>
                          <span className={`veg-icon-dot ${item.isVeg ? 'veg-fill' : 'non-veg-fill'}`}></span>
                        </span>
                        <span className="subcategory-tag">{item.subcategory}</span>
                        {!item.isAvailable && <span className="sold-out-badge">SOLD OUT</span>}
                      </div>
                      
                      <h3 className="dish-name">{item.name}</h3>
                      <p className="dish-price">{settings.currencySymbol || '₹'}{item.price}</p>
                    </div>

                    <div className="menu-card-image-action">
                      {item.imageUrl ? (
                        <div className="dish-image-wrapper">
                          <img 
                            src={item.imageUrl} 
                            alt={item.name} 
                            className="dish-image"
                            onError={(e) => {
                              // Fallback image if Unsplash fails/404s
                              e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=150&h=150&q=80';
                            }}
                          />
                        </div>
                      ) : (
                        <div className="dish-image-wrapper fallback-bg">
                          <UtensilsCrossed size={20} className="fallback-icon" />
                        </div>
                      )}
                      
                      <div className="action-button-container">
                        {!item.isAvailable ? (
                          <button className="add-to-cart-btn disabled" disabled>
                            Sold Out
                          </button>
                        ) : cartItem ? (
                          <div className="qty-control-badge">
                            <button 
                              className="qty-btn" 
                              onClick={() => updateQuantity(item.id, -1)}
                              aria-label="Decrease quantity"
                            >
                              <Minus size={14} />
                            </button>
                            <span className="qty-val">{cartItem.quantity}</span>
                            <button 
                              className="qty-btn" 
                              onClick={() => updateQuantity(item.id, 1)}
                              aria-label="Increase quantity"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        ) : (
                          <button 
                            className="add-to-cart-btn"
                            onClick={() => addToCart(item)}
                            disabled={!tableNumber}
                            title={!tableNumber ? "Select a table to order" : ""}
                          >
                            Add
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* 5. FLOATING BOTTOM CART BAR */}
      {cartCount > 0 && !isCartOpen && (
        <div className="floating-cart-bar" onClick={() => setIsCartOpen(true)}>
          <div className="bar-details">
            <div className="shopping-cart-container">
              <ShoppingCart size={20} />
              <span className="bar-count">{cartCount} {cartCount === 1 ? 'item' : 'items'}</span>
            </div>
            <span className="bar-total">Grand Total: {settings.currencySymbol || '₹'}{cartGrandTotal}</span>
          </div>
          <button className="view-cart-btn">View Cart</button>
        </div>
      )}

      {/* 6. SLIDE-OUT CART DRAWER */}
      <div className={`cart-drawer-overlay ${isCartOpen ? 'open' : ''}`} onClick={() => setIsCartOpen(false)}>
        <div className="cart-drawer" onClick={(e) => e.stopPropagation()}>
          <div className="drawer-header">
            <div className="drawer-title-group">
              <ShoppingCart size={22} className="gold" />
              <h2>Your Order Cart</h2>
            </div>
            <button className="close-drawer-btn" onClick={() => setIsCartOpen(false)}>
              <X size={22} />
            </button>
          </div>

          <div className="drawer-content">
            {cartItemsArray.length === 0 ? (
              <div className="empty-cart-drawer" style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '70%',
                padding: '40px 20px',
                textAlign: 'center'
              }}>
                {/* Premium illustration container */}
                <div className="empty-state-illustration" style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '110px',
                  height: '110px',
                  margin: '0 auto 20px auto',
                }}>
                  <div style={{
                    position: 'absolute',
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(var(--gold-accent-rgb, 212, 175, 55), 0.12) 0%, transparent 70%)',
                    filter: 'blur(8px)',
                  }}></div>
                  <div style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '64px',
                    height: '64px',
                    borderRadius: '22px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(var(--gold-accent-rgb, 212, 175, 55), 0.2)',
                    boxShadow: 'inset 0 4px 10px rgba(0,0,0,0.15)',
                  }}>
                    <ShoppingCart size={28} style={{ color: 'var(--gold-accent)' }} />
                  </div>
                </div>
                
                <h3 style={{ fontSize: '17px', fontWeight: '600', color: 'var(--text-main)', margin: '0 0 8px 0' }}>
                  Your cart is empty
                </h3>
                
                <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', maxWidth: '280px', margin: '0 0 24px 0', lineHeight: '1.4' }}>
                  Browse our menu and add items to place your table order.
                </p>

                <button 
                  className="browse-menu-btn" 
                  onClick={() => setIsCartOpen(false)}
                  style={{
                    background: 'var(--gold-accent)',
                    border: 'none',
                    color: '#000',
                    padding: '12px 28px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '14px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(var(--gold-accent-rgb, 212, 175, 55), 0.25)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  Browse Menu
                </button>
              </div>
            ) : (
              <div className="cart-items-list">
                {cartItemsArray.map(item => (
                  <div key={item.id} className="cart-item-row">
                    <div className="cart-item-info">
                      <div className="item-name-badge">
                        <span className={`veg-icon-border ${item.isVeg ? 'veg-border' : 'non-veg-border'}`}>
                          <span className={`veg-icon-dot ${item.isVeg ? 'veg-fill' : 'non-veg-fill'}`}></span>
                        </span>
                        <span className="cart-item-name">{item.name}</span>
                      </div>
                      <span className="cart-item-subtotal">{settings.currencySymbol || '₹'}{item.price * item.quantity}</span>
                    </div>

                    <div className="cart-item-controls">
                      <div className="qty-control-badge">
                        <button className="qty-btn" onClick={() => updateQuantity(item.id, -1)}>
                          <Minus size={14} />
                        </button>
                        <span className="qty-val">{item.quantity}</span>
                        <button className="qty-btn" onClick={() => updateQuantity(item.id, 1)}>
                          <Plus size={14} />
                        </button>
                      </div>
                      
                      <button 
                        className="delete-item-btn" 
                        onClick={() => removeFromCart(item.id)}
                        aria-label="Remove item"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {cartItemsArray.length > 0 && (
            <div className="drawer-footer">
              <div className="cart-summary-calculations">
                <div className="summary-calc-row">
                  <span>Subtotal</span>
                  <span>{settings.currencySymbol || '₹'}{cartSubtotal}</span>
                </div>
                <div className="summary-calc-row">
                  <span>GST ({settings.gstPercentage}%)</span>
                  <span>{settings.currencySymbol || '₹'}{gstAmount}</span>
                </div>
                <div className="summary-calc-row">
                  <span>Service Charge ({settings.serviceChargePercentage}%)</span>
                  <span>{settings.currencySymbol || '₹'}{serviceChargeAmount}</span>
                </div>
                <div className="total-summary-row mt-1">
                  <span>Grand Total</span>
                  <span className="grand-total-val">{settings.currencySymbol || '₹'}{cartGrandTotal}</span>
                </div>
              </div>
              
              {!tableNumber ? (
                <div className="checkout-warning-banner">
                  <AlertTriangle size={16} />
                  <span>Cannot order: Table number is not identified. Please scan the QR code.</span>
                </div>
              ) : (
                <button 
                  className="place-order-submit-btn"
                  onClick={handlePlaceOrder}
                  disabled={checkoutLoading}
                >
                  {checkoutLoading ? (
                    <span className="loading-spinner-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <span className="loading-spinner-inline"></span>
                      <span>Placing your order...</span>
                    </span>
                  ) : (
                    <span>Confirm & Place Order (Table {tableNumber})</span>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 7. DETAILED ORDER SUCCESS RECEIPT OVERLAY */}
      {showSuccessOverlay && latestOrder && (
        <div className="success-modal-overlay">
          <div className="success-modal-card receipt-modal">
            <div className="checkmark-wrapper">
              <CheckCircle className="checkmark-icon" size={48} />
            </div>
            
            <h2 className="success-title">Order Placed Successfully</h2>
            <p className="success-desc">
              {activeOrderStatus === 'pending' && 'Awaiting acceptance from the kitchen staff...'}
              {activeOrderStatus === 'accepted' && 'Your order has been accepted by the kitchen!'}
              {activeOrderStatus === 'preparing' && 'Chef is preparing your delicious meal.'}
              {activeOrderStatus === 'ready' && 'Your order is ready!'}
              {activeOrderStatus === 'served' && 'Your order has been served. Enjoy your meal!'}
            </p>

            {/* Visual Progress Stepper */}
            <div className="status-progress-container">
              <div className="status-progress-line-bg">
                <div 
                  className="status-progress-line-fill" 
                  style={{ 
                    width: `${
                      activeOrderStatus === 'pending' ? 0 :
                      activeOrderStatus === 'accepted' ? 25 :
                      activeOrderStatus === 'preparing' ? 50 :
                      activeOrderStatus === 'ready' ? 75 :
                      activeOrderStatus === 'served' || activeOrderStatus === 'completed' ? 100 : 0
                    }%` 
                  }}
                ></div>
              </div>
              <div className="status-steps-wrapper">
                {[
                  { key: 'pending', label: 'New' },
                  { key: 'accepted', label: 'Accepted' },
                  { key: 'preparing', label: 'Preparing' },
                  { key: 'ready', label: 'Ready' },
                  { key: 'served', label: 'Served' }
                ].map((step, idx) => {
                  const currentIdx = 
                    activeOrderStatus === 'pending' ? 0 :
                    activeOrderStatus === 'accepted' ? 1 :
                    activeOrderStatus === 'preparing' ? 2 :
                    activeOrderStatus === 'ready' ? 3 :
                    activeOrderStatus === 'served' || activeOrderStatus === 'completed' ? 4 : 0;
                  const isCompleted = idx < currentIdx;
                  const isActive = idx === currentIdx;
                  return (
                    <div 
                      key={step.key} 
                      className={`step-node ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}`}
                    >
                      <div className="step-circle">
                        {isCompleted ? '✓' : idx + 1}
                      </div>
                      <span className="step-label">{step.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* The Order Receipt */}
            <div className="receipt-paper">
              <div className="receipt-header">
                <h3 className="receipt-restaurant">{latestOrder.restaurantName || settings.restaurantName}</h3>
                {settings.address && <p style={{ fontSize: '10px', textAlign: 'center', margin: '2px 0 0 0', opacity: 0.8, fontFamily: 'monospace' }}>{settings.address}</p>}
                {settings.phoneNumber && <p style={{ fontSize: '10px', textAlign: 'center', margin: '2px 0 0 0', opacity: 0.8, fontFamily: 'monospace' }}>Tel: {settings.phoneNumber}</p>}
                <span className="receipt-divider-dotted"></span>
                <div className="receipt-meta-row">
                  <span>Order ID: <strong>#000{latestOrder.orderId}</strong></span>
                  <span>Table: <strong>Table {latestOrder.tableNumber}</strong></span>
                </div>
                <div className="receipt-meta-row">
                  <span>Time: {latestOrder.time}</span>
                </div>
              </div>
              
              <span className="receipt-divider-solid"></span>
              
              <div className="receipt-items">
                {latestOrder.items.map((item, idx) => (
                  <div key={idx} className="receipt-item-row">
                    <span className="receipt-item-qty-name">{item.quantity}x {item.name}</span>
                    <span className="receipt-item-price">{settings.currencySymbol || '₹'}{item.price * item.quantity}</span>
                  </div>
                ))}
              </div>
              
              <span className="receipt-divider-solid"></span>
              
              <div className="receipt-totals">
                <div className="receipt-total-row">
                  <span>Subtotal</span>
                  <span>{settings.currencySymbol || '₹'}{latestOrder.subtotal}</span>
                </div>
                <div className="receipt-total-row">
                  <span>GST ({settings.gstPercentage}%)</span>
                  <span>{settings.currencySymbol || '₹'}{latestOrder.gst}</span>
                </div>
                <div className="receipt-total-row">
                  <span>Service Charge ({settings.serviceChargePercentage}%)</span>
                  <span>{settings.currencySymbol || '₹'}{latestOrder.serviceCharge}</span>
                </div>
                <span className="receipt-divider-dotted"></span>
                <div className="receipt-grand-total-row">
                  <span>Grand Total</span>
                  <span>{settings.currencySymbol || '₹'}{latestOrder.grandTotal}</span>
                </div>
              </div>
            </div>
 
            <button 
              className="dismiss-success-btn"
              onClick={() => setShowSuccessOverlay(false)}
            >
              Order More Items
            </button>
          </div>
        </div>
      )}

      {/* 8. FLOATING ACTIVE ORDER TRACKER */}
      {!showSuccessOverlay && activeOrderId && !['served', 'completed', 'cancelled'].includes(activeOrderStatus) && (
        <div 
          className={`floating-order-tracker ${cartCount > 0 && !isCartOpen ? 'has-cart-bar' : ''}`} 
          onClick={() => {
            setCurrentPath('/order-status');
            window.history.pushState({}, '', `/order-status?id=${activeOrderId}`);
          }}
        >
          <div className="tracker-glow"></div>
          <div className="tracker-content">
            <span className="tracker-icon-pulse">
              <ChefHat size={18} className="spin-slow" />
            </span>
            <div className="tracker-text-details">
              <span className="tracker-title">Tracking Order #000{activeOrderId}</span>
              <span className="tracker-status">
                {activeOrderStatus === 'pending' && 'New (Awaiting acceptance)'}
                {activeOrderStatus === 'accepted' && 'Accepted (Preparing soon)'}
                {activeOrderStatus === 'preparing' && 'Preparing in the kitchen'}
                {activeOrderStatus === 'ready' && 'Ready for pickup/serving!'}
              </span>
            </div>
            <button className="tracker-action-btn">
              <span>View status</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

function SetupPage({ settings, setSettings, setCurrentPath, onLogout }) {
  const [form, setForm] = useState({
    restaurantName: settings.restaurantName || '',
    logoUrl: settings.logoUrl || '',
    tagline: settings.tagline || '',
    phoneNumber: settings.phoneNumber || '',
    address: settings.address || '',
    themeColor: settings.themeColor || '#d4af37',
    currencySymbol: settings.currencySymbol || '₹',
    gstPercentage: String(settings.gstPercentage || '5.0')
  });

  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ success: false, message: '' });

  // Update live preview style on themeColor change
  useEffect(() => {
    if (form.themeColor) {
      document.documentElement.style.setProperty('--gold-accent', form.themeColor);
      const hex = form.themeColor.replace('#', '');
      if (hex.length === 6) {
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        document.documentElement.style.setProperty('--gold-accent-rgb', `${r}, ${g}, ${b}`);
      }
    }
  }, [form.themeColor]);

  const handleExportBackup = () => {
    setStatus({ success: false, message: 'Exporting configuration...' });
    fetch(API_BASE_URL + '/api/backup')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          // Convert data to JSON blob and download it
          const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
            JSON.stringify(data.backup, null, 2)
          )}`;
          const downloadAnchor = document.createElement('a');
          downloadAnchor.setAttribute('href', jsonString);
          const timestamp = new Date().toISOString().slice(0, 10);
          downloadAnchor.setAttribute('download', `restaurant_backup_${timestamp}.json`);
          document.body.appendChild(downloadAnchor);
          downloadAnchor.click();
          downloadAnchor.remove();
          setStatus({ success: true, message: 'Configuration exported successfully!' });
        } else {
          setStatus({ success: false, message: 'Export failed: ' + (data.message || 'unknown error') });
        }
      })
      .catch(err => {
        console.error(err);
        setStatus({ success: false, message: 'Error exporting backup. See console.' });
      });
  };

  const handleImportBackup = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!confirm('WARNING: Restoring a configuration will replace all existing settings, menu items, and registered tables. Are you sure you want to proceed?')) {
      e.target.value = null; // Clear input
      return;
    }

    setStatus({ success: false, message: 'Reading backup file...' });
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const backupData = JSON.parse(event.target.result);
        if (!backupData.settings || !backupData.menuItems) {
          throw new Error('JSON is missing settings or menuItems tables');
        }

        setStatus({ success: false, message: 'Uploading backup configuration...' });
        fetch(API_BASE_URL + '/api/restore', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ backup: backupData })
        })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setStatus({ success: true, message: 'Configuration restored successfully!' });
            // Extract settings from restored configuration and refresh state
            const config = {};
            if (Array.isArray(backupData.settings)) {
              backupData.settings.forEach(s => {
                const keyMap = {
                  restaurant_name: 'restaurantName',
                  logo_url: 'logoUrl',
                  phone_number: 'phoneNumber',
                  address: 'address',
                  theme_color: 'themeColor',
                  currency_symbol: 'currencySymbol',
                  tagline: 'tagline',
                  gst_percentage: 'gstPercentage',
                  service_charge_percentage: 'serviceChargePercentage'
                };
                const mappedKey = keyMap[s.key] || s.key;
                config[mappedKey] = s.value;
              });
            }
            if (config.gstPercentage !== undefined) config.gstPercentage = parseFloat(config.gstPercentage);
            if (config.serviceChargePercentage !== undefined) config.serviceChargePercentage = parseFloat(config.serviceChargePercentage);

            const merged = { ...settings, ...config };
            setSettings(merged);
            setForm({
              restaurantName: merged.restaurantName || '',
              logoUrl: merged.logoUrl || '',
              tagline: merged.tagline || '',
              phoneNumber: merged.phoneNumber || '',
              address: merged.address || '',
              themeColor: merged.themeColor || '#d4af37',
              currencySymbol: merged.currencySymbol || '₹',
              gstPercentage: String(merged.gstPercentage || '5.0')
            });
          } else {
            setStatus({ success: false, message: `Restore failed: ${data.message}` });
          }
          e.target.value = null; // Clear input
        })
        .catch(err => {
          console.error(err);
          setStatus({ success: false, message: 'Network error restoring settings.' });
          e.target.value = null;
        });

      } catch (err) {
        setStatus({ success: false, message: 'Invalid JSON file: ' + err.message });
        e.target.value = null;
      }
    };
    reader.readAsText(file);
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm(prev => ({ ...prev, logoUrl: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!form.restaurantName.trim()) {
      alert('Restaurant Name is required');
      return;
    }
    setSaving(true);
    setStatus({ success: false, message: 'Saving configurations...' });

    fetch(API_BASE_URL + '/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        restaurantName: form.restaurantName,
        logoUrl: form.logoUrl,
        tagline: form.tagline,
        phoneNumber: form.phoneNumber,
        address: form.address,
        themeColor: form.themeColor,
        currencySymbol: form.currencySymbol,
        gstPercentage: parseFloat(form.gstPercentage || '0'),
        serviceChargePercentage: settings.serviceChargePercentage // preserve existing
      })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        setStatus({ success: true, message: 'Configuration saved successfully!' });
        setSettings(prev => ({
          ...prev,
          restaurantName: form.restaurantName,
          logoUrl: form.logoUrl,
          tagline: form.tagline,
          phoneNumber: form.phoneNumber,
          address: form.address,
          themeColor: form.themeColor,
          currencySymbol: form.currencySymbol,
          gstPercentage: parseFloat(form.gstPercentage || '0')
        }));
      } else {
        setStatus({ success: false, message: `Failed to save: ${data.message}` });
      }
      setSaving(false);
    })
    .catch(err => {
      console.error(err);
      setStatus({ success: false, message: 'Error saving settings. Please try again.' });
      setSaving(false);
    });
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset setup to defaults?')) {
      const defaults = {
        restaurantName: 'Lakshmi Ganesh Restaurant',
        logoUrl: 'https://res.cloudinary.com/dwatx4zlt/image/upload/v1782051849/Logo_copy_imxucw.jpg',
        tagline: 'Authentic Indian Flavors',
        phoneNumber: '+91 98765 43210',
        address: 'H.No. 12-34, Main Road, Hyderabad, 500001',
        themeColor: '#d4af37',
        currencySymbol: '₹',
        gstPercentage: '5.0'
      };
      setForm(defaults);
      setStatus({ success: false, message: '' });
    }
  };

  return (
    <div className="setup-container">
      <div className="setup-card">
        <div className="setup-header">
          <UtensilsCrossed className="setup-logo-icon" size={28} />
          <div>
            <h2>Restaurant Installer Setup</h2>
            <p>Configure brand settings before deploying the system</p>
          </div>
        </div>

        <div className="setup-tabs">
          <button 
            type="button" 
            className="setup-tab active"
            disabled
          >
            Settings Configurator
          </button>
          <button 
            type="button" 
            className="setup-tab"
            onClick={() => {
              setCurrentPath('/setup/qr');
              window.history.pushState({}, '', '/setup/qr');
            }}
          >
            QR Code Generator
          </button>
        </div>

        {/* Dynamic Live Preview */}
        <div className="preview-section">
          <h3>Customer Header Preview</h3>
          <header className="app-header preview-header-box">
            <div className="header-top">
              <div className="brand-logo-name">
                <img 
                  src={form.logoUrl || "https://res.cloudinary.com/dwatx4zlt/image/upload/v1782051849/Logo_copy_imxucw.jpg"} 
                  alt="Restaurant Logo" 
                  className="brand-logo"
                />
                <div>
                  <h1 className="brand-name">{form.restaurantName || 'Restaurant Name'}</h1>
                  <p className="brand-tagline">{form.tagline || 'Delicious Tagline'}</p>
                </div>
              </div>
              <button className="cart-toggle-btn" disabled>
                <ShoppingCart size={22} />
              </button>
            </div>
          </header>
        </div>

        <form onSubmit={handleSave} className="setup-form">
          <div className="form-grid">
            <div className="form-group full-width">
              <label>Restaurant Display Name *</label>
              <input 
                type="text" 
                value={form.restaurantName}
                onChange={e => setForm(prev => ({ ...prev, restaurantName: e.target.value }))}
                required
                placeholder="e.g. Lakshmi Ganesh Restaurant"
              />
            </div>

            <div className="form-group full-width">
              <label>Logo Upload (Image File)</label>
              <div className="file-upload-box">
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleLogoUpload}
                  id="logo-file-input"
                />
                {form.logoUrl && (
                  <button 
                    type="button" 
                    className="clear-logo-btn" 
                    onClick={() => setForm(prev => ({ ...prev, logoUrl: '' }))}
                  >
                    Clear Image
                  </button>
                )}
              </div>
            </div>

            <div className="form-group">
              <label>Tagline</label>
              <input 
                type="text" 
                value={form.tagline}
                onChange={e => setForm(prev => ({ ...prev, tagline: e.target.value }))}
                placeholder="e.g. Authentic Indian Flavors"
              />
            </div>

            <div className="form-group">
              <label>Phone Number</label>
              <input 
                type="text" 
                value={form.phoneNumber}
                onChange={e => setForm(prev => ({ ...prev, phoneNumber: e.target.value }))}
                placeholder="e.g. +91 98765 43210"
              />
            </div>

            <div className="form-group full-width">
              <label>Address</label>
              <input 
                type="text" 
                value={form.address}
                onChange={e => setForm(prev => ({ ...prev, address: e.target.value }))}
                placeholder="e.g. Main Street, Road No. 1, Hyderabad"
              />
            </div>

            <div className="form-group">
              <label>Theme Color (Hex Accent)</label>
              <div className="color-picker-group">
                <input 
                  type="color" 
                  value={form.themeColor.startsWith('#') && form.themeColor.length === 7 ? form.themeColor : '#d4af37'}
                  onChange={e => setForm(prev => ({ ...prev, themeColor: e.target.value }))}
                />
                <input 
                  type="text" 
                  value={form.themeColor}
                  onChange={e => setForm(prev => ({ ...prev, themeColor: e.target.value }))}
                  placeholder="#d4af37"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Currency Symbol</label>
              <input 
                type="text" 
                value={form.currencySymbol}
                onChange={e => setForm(prev => ({ ...prev, currencySymbol: e.target.value }))}
                placeholder="e.g. ₹ or $"
                maxLength={5}
              />
            </div>

            <div className="form-group">
              <label>GST Percentage (%)</label>
              <input 
                type="number" 
                step="0.01"
                value={form.gstPercentage}
                onChange={e => setForm(prev => ({ ...prev, gstPercentage: e.target.value }))}
                placeholder="e.g. 5.0"
              />
            </div>
          </div>

          {status.message && (
            <div className={`status-banner ${status.success ? 'success' : 'error'}`}>
              {status.success ? <CheckCircle size={16} /> : <AlertTriangle className="error" size={16} />}
              <span>{status.message}</span>
            </div>
          )}

          <div className="setup-actions">
            <button 
              type="button" 
              onClick={handleReset} 
              className="reset-setup-btn"
              disabled={saving}
            >
              Reset Configuration
            </button>
            <button 
              type="submit" 
              className="save-setup-btn"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </form>

        <div className="backup-restore-section">
          <h3>Backup & Restore</h3>
          <p className="section-desc">Export current brand settings, menu items, and tables to a JSON file, or restore them from a backup.</p>
          <div className="backup-actions">
            <button 
              type="button" 
              onClick={handleExportBackup} 
              className="export-backup-btn"
              title="Download entire configuration as a JSON file"
            >
              Export Configuration
            </button>
            <div className="import-file-wrapper">
              <label htmlFor="import-backup-file" className="import-backup-label">
                Import Configuration
              </label>
              <input 
                type="file" 
                id="import-backup-file" 
                accept=".json" 
                onChange={handleImportBackup} 
                className="import-backup-input"
              />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
          <button 
            onClick={() => {
              setCurrentPath('/');
              window.history.pushState({}, '', '/');
            }} 
            className="back-to-menu-link-btn"
            style={{ width: '100%' }}
          >
            Go to Customer Menu Page
          </button>
          
          <button 
            type="button"
            onClick={onLogout} 
            className="reset-setup-btn"
            style={{ width: 'auto', margin: '0 auto', border: '1px solid rgba(239, 68, 68, 0.35)', color: '#f87171', background: 'rgba(239, 68, 68, 0.05)', fontSize: '13px', padding: '8px 20px' }}
          >
            Logout Session
          </button>
        </div>
      </div>
    </div>
  );
}

function OrderStatusPage({ settings, setCurrentPath, activeOrderId, activeOrderStatus, latestOrder }) {
  const getStatusStepIndex = (status) => {
    const mapping = {
      pending: 0,
      accepted: 1,
      preparing: 2,
      ready: 3,
      served: 4,
      completed: 4
    };
    return mapping[status] !== undefined ? mapping[status] : 0;
  };

  const currentStep = getStatusStepIndex(activeOrderStatus);

  // Status mapping details
  const statusDetails = {
    pending: { label: 'New', color: 'pending', icon: '🟡', message: 'Your order has been received.' },
    accepted: { label: 'Accepted', color: 'accepted', icon: '🔵', message: 'Kitchen has started preparing your food.' },
    preparing: { label: 'Preparing', color: 'preparing', icon: '🟠', message: 'Kitchen has started preparing your food.' },
    ready: { label: 'Ready', color: 'ready', icon: '🟢', message: 'Your food is ready.' },
    served: { label: 'Served', color: 'served', icon: '✅', message: 'Order completed. Thank you!' },
    completed: { label: 'Completed', color: 'served', icon: '✅', message: 'Order completed. Thank you!' },
    cancelled: { label: 'Cancelled', color: 'cancelled', icon: '❌', message: 'Your order was cancelled.' }
  };

  const activeStatusDetail = statusDetails[activeOrderStatus] || statusDetails.pending;

  return (
    <div className="order-status-container">
      <div className="order-status-card">
        {/* Header Branding */}
        <header className="status-header">
          <div className="status-brand">
            <img 
              src={settings.logoUrl || "https://res.cloudinary.com/dwatx4zlt/image/upload/v1782051849/Logo_copy_imxucw.jpg"} 
              alt="Logo" 
              className="status-logo"
            />
            <div>
              <h2 className="status-restaurant-name">{settings.restaurantName}</h2>
              <p className="status-restaurant-tagline">{settings.tagline || 'QR Order & Dine'}</p>
            </div>
          </div>
          <button 
            className="status-back-btn"
            onClick={() => {
              setCurrentPath('/');
              window.history.pushState({}, '', '/');
            }}
          >
            Back to Menu
          </button>
        </header>

        {/* Live Tracking Card */}
        <div className="live-tracking-panel">
          <div className={`status-banner-large status-${activeStatusDetail.color}`}>
            <span className="status-emoji-icon">{activeStatusDetail.icon}</span>
            <div className="status-headline-group">
              <span className="status-sub">CURRENT STATUS</span>
              <h3 className="status-main-label">{activeStatusDetail.label.toUpperCase()}</h3>
            </div>
          </div>

          <div className="waiting-message-box">
            <p className="waiting-message-text">"{activeStatusDetail.message}"</p>
          </div>

          {/* Timeline Stepper */}
          <div className="timeline-progress-wrapper">
            <div className="timeline-line-bg">
              <div 
                className="timeline-line-fill" 
                style={{ width: `${(currentStep / 4) * 100}%` }}
              ></div>
            </div>
            <div className="timeline-steps">
              {[
                { key: 'pending', label: 'New', icon: '🟡' },
                { key: 'accepted', label: 'Accepted', icon: '🔵' },
                { key: 'preparing', label: 'Preparing', icon: '🟠' },
                { key: 'ready', label: 'Ready', icon: '🟢' },
                { key: 'served', label: 'Served', icon: '✅' }
              ].map((step, idx) => {
                const isCompleted = idx < currentStep;
                const isActive = idx === currentStep;
                return (
                  <div 
                    key={step.key} 
                    className={`timeline-step-node ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}`}
                  >
                    <div className="timeline-step-circle">
                      {isCompleted ? '✓' : idx + 1}
                    </div>
                    <span className="timeline-step-label">{step.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Order Details Paper */}
        {latestOrder && (
          <div className="receipt-paper status-receipt">
            <div className="receipt-header">
              <span className="receipt-title">ORDER RECEIPT</span>
              <span className="receipt-divider-dotted"></span>
              <div className="receipt-meta-row">
                <span>Order ID: <strong>#000{latestOrder.orderId}</strong></span>
                <span>Table: <strong>Table {latestOrder.tableNumber}</strong></span>
              </div>
              <div className="receipt-meta-row">
                <span>Time Placed: {latestOrder.time}</span>
              </div>
            </div>
            
            <span className="receipt-divider-solid"></span>
            
            <div className="receipt-items">
              {latestOrder.items.map((item, idx) => (
                <div key={idx} className="receipt-item-row">
                  <span className="receipt-item-qty-name">{item.quantity}x {item.name}</span>
                  <span className="receipt-item-price">{settings.currencySymbol || '₹'}{item.price * item.quantity}</span>
                </div>
              ))}
            </div>
            
            <span className="receipt-divider-solid"></span>
            
            <div className="receipt-totals">
              {latestOrder.subtotal !== undefined && latestOrder.grandTotal !== latestOrder.subtotal && (
                <>
                  <div className="receipt-total-row">
                    <span>Subtotal</span>
                    <span>{settings.currencySymbol || '₹'}{latestOrder.subtotal}</span>
                  </div>
                  <div className="receipt-total-row">
                    <span>GST ({settings.gstPercentage}%)</span>
                    <span>{settings.currencySymbol || '₹'}{latestOrder.gst}</span>
                  </div>
                  <div className="receipt-total-row">
                    <span>Service Charge ({settings.serviceChargePercentage}%)</span>
                    <span>{settings.currencySymbol || '₹'}{latestOrder.serviceCharge}</span>
                  </div>
                  <span className="receipt-divider-dotted"></span>
                </>
              )}
              <div className="receipt-grand-total-row">
                <span>Total Amount Paid</span>
                <span>{settings.currencySymbol || '₹'}{latestOrder.grandTotal}</span>
              </div>
            </div>
          </div>
        )}

        <div className="order-status-actions">
          <button 
            className="order-more-btn"
            onClick={() => {
              setCurrentPath('/');
              window.history.pushState({}, '', '/');
            }}
          >
            Order More Food
          </button>
        </div>
      </div>
    </div>
  );
}

function SetupLoginPage({ onLoginSuccess, settings, setCurrentPath }) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    setError('');

    fetch(API_BASE_URL + '/api/setup/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    })
    .then(async res => {
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Incorrect password');
      }
      return res.json();
    })
    .then(data => {
      if (data.success) {
        sessionStorage.setItem('lgr_setup_auth', 'true');
        onLoginSuccess();
      }
      setLoading(false);
    })
    .catch(err => {
      console.error('[Setup Login Error]', err);
      setError(err.message || 'Authentication failed. Please try again.');
      setLoading(false);
    });
  };

  return (
    <div className="setup-container">
      <div className="setup-card" style={{ maxWidth: '400px', margin: '80px auto' }}>
        <div className="setup-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '8px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '60px',
            height: '60px',
            borderRadius: '20px',
            background: 'rgba(var(--gold-accent-rgb, 212, 175, 55), 0.08)',
            border: '1.5px solid var(--gold-accent)',
            marginBottom: '8px',
            boxShadow: '0 0 15px rgba(var(--gold-accent-rgb, 212, 175, 55), 0.15)'
          }}>
            <UtensilsCrossed size={28} className="gold" />
          </div>
          <h2>Setup Admin Access</h2>
          <p>Please enter the administrator password to view the Installer Configurator.</p>
        </div>

        <form onSubmit={handleSubmit} className="setup-form" style={{ marginTop: '24px' }}>
          <div className="form-group full-width">
            <label>Admin Password</label>
            <input 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={loading}
              autoFocus
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                color: 'var(--text-main)',
                padding: '12px',
                borderRadius: '8px',
                width: '100%',
                fontSize: '14px',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            />
          </div>

          {error && (
            <div className="status-banner error" style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px',
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: '8px',
              color: '#f87171',
              fontSize: '13px',
              marginTop: '16px'
            }}>
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '24px' }}>
            <button 
              type="submit" 
              className="save-setup-btn"
              disabled={loading || !password}
              style={{ width: '100%', padding: '12px', fontSize: '14px' }}
            >
              {loading ? 'Authenticating...' : 'Authenticate'}
            </button>
            <button 
              type="button" 
              onClick={() => {
                setCurrentPath('/');
                window.history.pushState({}, '', '/');
              }} 
              className="back-to-menu-link-btn"
              style={{ margin: '0 auto', fontSize: '13px' }}
            >
              Back to Customer Menu
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default App;
