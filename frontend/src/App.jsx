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
  Info
} from 'lucide-react';

function App() {
  // State variables
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Restaurant Settings
  const [settings, setSettings] = useState({
    restaurantName: 'Lakshmi Ganesh Restaurant',
    gstPercentage: 5.0,
    serviceChargePercentage: 2.5
  });
  
  // Table identifier
  const [tableNumber, setTableNumber] = useState(null);
  
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
      fetch('/api/tables', {
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
    fetch('/api/settings')
      .then(res => res.json())
      .then(resJson => {
        if (resJson.success) {
          setSettings(resJson.data);
        }
      })
      .catch(err => console.error('[Settings] Load failed:', err));

    // 2. Fetch menu
    fetch('/api/menu')
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

    fetch('/api/orders', {
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
        
        // Reset states
        clearCart();
        setIsCartOpen(false);
        setShowSuccessOverlay(true);
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

  return (
    <div className="menu-app">
      {/* 1. HEADER BRANDING */}
      <header className="app-header">
        <div className="header-top">
          <div className="brand-logo-name">
            <img 
              src="https://res.cloudinary.com/dwatx4zlt/image/upload/v1782051849/Logo_copy_imxucw.jpg" 
              alt={`${settings.restaurantName} Logo`} 
              className="brand-logo"
            />
            <div>
              <h1 className="brand-name">{settings.restaurantName}</h1>
              <p className="brand-tagline">Authentic Indian Flavors</p>
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
            <div className="no-items-box">
              <UtensilsCrossed size={32} className="no-items-icon" />
              <p>No dishes found.</p>
              {(searchQuery || vegFilter !== 'all') && (
                <button 
                  className="reset-filters-btn"
                  onClick={() => {
                    setSearchQuery('');
                    setVegFilter('all');
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
                      <p className="dish-price">₹{item.price}</p>
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
            <span className="bar-total">Grand Total: ₹{cartGrandTotal}</span>
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
              <div className="empty-cart-drawer">
                <UtensilsCrossed size={48} className="empty-icon" />
                <h3>Your cart is empty</h3>
                <p>Browse our menu and add items to place your table order.</p>
                <button className="browse-menu-btn" onClick={() => setIsCartOpen(false)}>
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
                      <span className="cart-item-subtotal">₹{item.price * item.quantity}</span>
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
                  <span>₹{cartSubtotal}</span>
                </div>
                <div className="summary-calc-row">
                  <span>GST ({settings.gstPercentage}%)</span>
                  <span>₹{gstAmount}</span>
                </div>
                <div className="summary-calc-row">
                  <span>Service Charge ({settings.serviceChargePercentage}%)</span>
                  <span>₹{serviceChargeAmount}</span>
                </div>
                <div className="total-summary-row mt-1">
                  <span>Grand Total</span>
                  <span className="grand-total-val">₹{cartGrandTotal}</span>
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
            <p className="success-desc">Send to the kitchen for preparation.</p>
            
            {/* The Order Receipt */}
            <div className="receipt-paper">
              <div className="receipt-header">
                <h3 className="receipt-restaurant">{latestOrder.restaurantName || settings.restaurantName}</h3>
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
                    <span className="receipt-item-price">₹{item.price * item.quantity}</span>
                  </div>
                ))}
              </div>
              
              <span className="receipt-divider-solid"></span>
              
              <div className="receipt-totals">
                <div className="receipt-total-row">
                  <span>Subtotal</span>
                  <span>₹{latestOrder.subtotal}</span>
                </div>
                <div className="receipt-total-row">
                  <span>GST ({settings.gstPercentage}%)</span>
                  <span>₹{latestOrder.gst}</span>
                </div>
                <div className="receipt-total-row">
                  <span>Service Charge ({settings.serviceChargePercentage}%)</span>
                  <span>₹{latestOrder.serviceCharge}</span>
                </div>
                <span className="receipt-divider-dotted"></span>
                <div className="receipt-grand-total-row">
                  <span>Grand Total</span>
                  <span>₹{latestOrder.grandTotal}</span>
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
    </div>
  );
}

export default App;
