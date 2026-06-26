import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Calendar, 
  Clock, 
  RotateCw, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  AlertCircle, 
  Info,
  DollarSign,
  FilterX,
  Download,
  Archive,
  Trash2
} from 'lucide-react';
import { jsPDF } from 'jspdf';

const API_BASE_URL = import.meta.env.DEV ? '' : 'https://serveqr-api.onrender.com';

function OrderHistoryPage({ settings }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  // Filters State
  const [searchId, setSearchId] = useState('');
  const [searchTable, setSearchTable] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');

  // Fetch all orders
  // Fetch all orders
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

  const getTodayHistoricalOrders = () => {
    return orders.filter(o => 
      (o.status === 'served' || o.status === 'completed' || o.status === 'cancelled') &&
      isToday(o.createdAt)
    );
  };

  const handleExportCSV = () => {
    const todayServed = getTodayHistoricalOrders();
    if (todayServed.length === 0) {
      alert("No archived orders found for today yet.");
      return;
    }

    const gstPercent = settings.gstPercentage || 0;
    const scPercent = settings.serviceChargePercentage || 0;
    const factor = 1 + (gstPercent / 100) + (scPercent / 100);

    let csvContent = "Restaurant Name,Date,Order ID,Table,Items,Quantity,Total,GST,Service Charge,Grand Total,Payment Status,Time\n";

    todayServed.forEach(order => {
      const itemsStr = order.items.map(it => `${it.quantity}x ${it.name}`).join(' | ');
      const totalQty = order.items.reduce((sum, it) => sum + it.quantity, 0);
      
      const subtotal = Number((order.totalAmount / factor).toFixed(2));
      const gstAmount = Number((subtotal * (gstPercent / 100)).toFixed(2));
      const scAmount = Number((subtotal * (scPercent / 100)).toFixed(2));

      const cleanRestaurant = `"${settings.restaurantName.replace(/"/g, '""')}"`;
      
      // Parse local time
      const dateStrFormatted = order.createdAt.includes(' ') && !order.createdAt.includes('T')
        ? order.createdAt.replace(' ', 'T') + 'Z' 
        : order.createdAt;
      const orderDate = new Date(dateStrFormatted);
      
      const dateStr = orderDate.toLocaleDateString();
      const timeStr = orderDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const cleanItems = `"${itemsStr.replace(/"/g, '""')}"`;

      csvContent += `${cleanRestaurant},${dateStr},${order.id},${order.tableNumber},${cleanItems},${totalQty},${subtotal},${gstAmount},${scAmount},${order.totalAmount},${order.paymentStatus},"${timeStr}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${settings.restaurantName.replace(/\s+/g, '_')}_Orders_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = async () => {
    const todayServed = getTodayHistoricalOrders();
    if (todayServed.length === 0) {
      alert("No archived orders found for today yet.");
      return;
    }

    // Try preloading logo image
    let logoImg = null;
    if (settings.logoUrl) {
      try {
        logoImg = await new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = 'Anonymous';
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
          img.src = settings.logoUrl;
        });
      } catch (e) {
        console.error("Failed preloading logo image:", e);
      }
    }

    // Initialize PDF document
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    
    // Theme details
    const themeColor = settings.themeColor || '#d4af37';
    const themeRgb = hexToRgb(themeColor);

    // Calculate dynamic values for today's orders
    const todayRevenue = todayServed.reduce((sum, o) => sum + o.totalAmount, 0);
    const activeTables = new Set(todayServed.map(o => o.tableNumber)).size;
    const avgOrderVal = todayServed.length ? Number((todayRevenue / todayServed.length).toFixed(2)) : 0;

    // Helper conversion factor for tax sub-calculations
    const gstPercent = settings.gstPercentage || 0;
    const scPercent = settings.serviceChargePercentage || 0;
    const factor = 1 + (gstPercent / 100) + (scPercent / 100);

    // Draw header branding strip
    doc.setFillColor(themeRgb.r, themeRgb.g, themeRgb.b);
    doc.rect(15, 15, 180, 22, 'F');

    // Draw logo image if loaded
    let drewLogo = false;
    if (logoImg) {
      try {
        const ext = settings.logoUrl.split('.').pop().split('?')[0].toUpperCase();
        const format = ext === 'PNG' ? 'PNG' : 'JPEG';
        
        // Draw white card backing for the logo to look premium
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(17, 17, 18, 18, 2, 2, 'F');
        
        // Add logo image inside the card
        doc.addImage(logoImg, format, 18, 18, 16, 16);
        drewLogo = true;
      } catch (imgErr) {
        console.error("Failed to add image to PDF, using fallback initials stamp", imgErr);
      }
    }

    if (!drewLogo) {
      // Stamp circle (white background)
      doc.setFillColor(255, 255, 255);
      doc.circle(28, 26, 7, 'F');

      // Initials in stamp circle
      doc.setTextColor(themeRgb.r, themeRgb.g, themeRgb.b);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      const initials = settings.restaurantName.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
      doc.text(initials, 25.5, 29.5);
    }

    // Restaurant Name & Tagline
    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(settings.restaurantName, 39, 24);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(settings.tagline || 'Daily Sales Audit Report', 39, 30);

    // Metadata Right-Aligned
    doc.setFontSize(8.5);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 155, 23);
    doc.text('Daily Operations Report', 155, 29);

    // Summary Analytics Box
    doc.setFillColor(245, 247, 250);
    doc.rect(15, 42, 180, 15, 'F');
    doc.setDrawColor(230, 235, 242);
    doc.rect(15, 42, 180, 15, 'D');

    doc.setTextColor(60, 66, 78);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(`Orders Today:`, 19, 51);
    doc.setFont('Helvetica', 'normal');
    doc.text(`${todayServed.length}`, 42, 51);

    doc.setFont('Helvetica', 'bold');
    doc.text(`Total Revenue:`, 59, 51);
    doc.setFont('Helvetica', 'normal');
    doc.text(`${settings.currencySymbol}${todayRevenue}`, 84, 51);

    doc.setFont('Helvetica', 'bold');
    doc.text(`AOV:`, 112, 51);
    doc.setFont('Helvetica', 'normal');
    doc.text(`${settings.currencySymbol}${avgOrderVal}`, 122, 51);

    doc.setFont('Helvetica', 'bold');
    doc.text(`Active Tables:`, 147, 51);
    doc.setFont('Helvetica', 'normal');
    doc.text(`${activeTables}`, 170, 51);

    // Draw table headers
    doc.setFillColor(50, 50, 50);
    doc.rect(15, 63, 180, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('Order ID', 16, 68);
    doc.text('Table', 29, 68);
    doc.text('Items', 39, 68);
    doc.text('Qty', 95, 68);
    doc.text('Total', 104, 68);
    doc.text('GST', 120, 68);
    doc.text('S.C.', 134, 68);
    doc.text('Grand Total', 146, 68);
    doc.text('Payment', 168, 68);
    doc.text('Time', 183, 68);

    // Draw rows
    let currentY = 75;
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(30, 30, 30);

    todayServed.forEach((order) => {
      // Pagination trigger check
      if (currentY > 270) {
        doc.addPage();
        
        // Draw simplified header
        doc.setFillColor(themeRgb.r, themeRgb.g, themeRgb.b);
        doc.rect(15, 15, 180, 10, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(10);
        doc.text(`${settings.restaurantName} - Daily Sales Audit (Cont.)`, 20, 21);
        
        // Draw table headers again
        doc.setFillColor(50, 50, 50);
        doc.rect(15, 28, 180, 7, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7.5);
        doc.text('Order ID', 16, 33);
        doc.text('Table', 29, 33);
        doc.text('Items', 39, 33);
        doc.text('Qty', 95, 33);
        doc.text('Total', 104, 33);
        doc.text('GST', 120, 33);
        doc.text('S.C.', 134, 33);
        doc.text('Grand Total', 146, 33);
        doc.text('Payment', 168, 33);
        doc.text('Time', 183, 33);
        
        currentY = 40;
      }

      // Calculations
      const itemsStr = order.items.map(it => `${it.quantity}x ${it.name}`).join(', ');
      const truncatedItems = itemsStr.length > 42 ? itemsStr.substring(0, 39) + '...' : itemsStr;
      const totalQty = order.items.reduce((sum, it) => sum + it.quantity, 0);
      const subtotal = Number((order.totalAmount / factor).toFixed(2));
      const gstAmount = Number((subtotal * (gstPercent / 100)).toFixed(2));
      const scAmount = Number((subtotal * (scPercent / 100)).toFixed(2));

      // Draw values
      doc.text(`#${order.id}`, 16, currentY);
      doc.text(`T-${order.tableNumber}`, 29, currentY);
      doc.text(truncatedItems, 39, currentY);
      doc.text(`${totalQty}`, 95, currentY);
      doc.text(`${settings.currencySymbol}${subtotal}`, 104, currentY);
      doc.text(`${settings.currencySymbol}${gstAmount}`, 120, currentY);
      doc.text(`${settings.currencySymbol}${scAmount}`, 134, currentY);
      doc.text(`${settings.currencySymbol}${order.totalAmount}`, 146, currentY);
      doc.text(`${order.paymentStatus}`, 168, currentY);
      doc.text(`${formatTimeOnly(order.createdAt)}`, 183, currentY);

      // Separator line
      doc.setDrawColor(240, 240, 240);
      doc.line(15, currentY + 3, 195, currentY + 3);
      currentY += 8;
    });

    // Add page numbers in footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setDrawColor(220, 220, 220);
      doc.line(15, 282, 195, 282);
      
      doc.setTextColor(150, 150, 150);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(`Generated by Staff Control Center | ${settings.restaurantName}`, 15, 287);
      doc.text(`Page ${i} of ${pageCount}`, 180, 287);
    }

    doc.save(`${settings.restaurantName.replace(/\s+/g, '_')}_Daily_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const hexToRgb = (hex) => {
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    const fullHex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 20, g: 184, b: 166 };
  };

  const fetchOrders = () => {
    setLoading(true);
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
        console.error('[Order History Load Error]', err);
        setError("Unable to fetch order history. Please try again.");
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Update payment status via API
  const handleTogglePayment = (orderId, currentPaymentStatus) => {
    const nextPaymentStatus = currentPaymentStatus === 'Paid' ? 'Unpaid' : 'Paid';

    fetch(`${API_BASE_URL}/api/orders/${orderId}/payment`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentStatus: nextPaymentStatus })
    })
      .then(async res => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || 'Failed to update payment status');
        }
        return res.json();
      })
      .then(data => {
        if (data.success) {
          // Update local state without full reload for smoother experience
          setOrders(prevOrders => 
            prevOrders.map(o => o.id === orderId ? { ...o, paymentStatus: nextPaymentStatus } : o)
          );
        } else {
          alert(`Failed to update payment status: ${data.message}`);
        }
      })
      .catch(err => {
        console.error('[Payment Update Error]', err);
        alert(err.message || "Unable to update payment status. Please try again.");
      });
  };

  // Delete a single completed/served/cancelled order
  const handleDeleteOrder = (orderId) => {
    if (!window.confirm("Are you sure you want to permanently delete this order?")) {
      return;
    }
    
    setLoading(true);
    fetch(`${API_BASE_URL}/api/orders/${orderId}`, {
      method: 'DELETE'
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to delete order');
        return res.json();
      })
      .then(data => {
        if (data.success) {
          fetchOrders();
        } else {
          alert('Failed to delete order: ' + data.message);
          setLoading(false);
        }
      })
      .catch(err => {
        console.error('[Delete Order Error]', err);
        alert(err.message || 'Unable to delete order. Please try again.');
        setLoading(false);
      });
  };

  // Delete all completed/served/cancelled order history
  const handleDeleteAllHistory = () => {
    if (!window.confirm("This action cannot be undone. Delete all order history?")) {
      return;
    }
    
    setLoading(true);
    fetch(API_BASE_URL + '/api/orders', {
      method: 'DELETE'
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to delete order history');
        return res.json();
      })
      .then(data => {
        if (data.success) {
          fetchOrders();
        } else {
          alert('Failed to delete history: ' + data.message);
          setLoading(false);
        }
      })
      .catch(err => {
        console.error('[Delete History Error]', err);
        alert(err.message || 'Unable to delete order history. Please try again.');
        setLoading(false);
      });
  };

  const toggleExpand = (orderId) => {
    setExpandedOrderId(prev => prev === orderId ? null : orderId);
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '—';
    const dateStrFormatted = dateString.includes(' ') && !dateString.includes('T')
      ? dateString.replace(' ', 'T') + 'Z' 
      : dateString;
    const date = new Date(dateStrFormatted);
    return date.toLocaleString([], { 
      year: 'numeric', 
      month: 'short', 
      day: '2-digit', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatTimeOnly = (dateString) => {
    if (!dateString) return '—';
    const dateStrFormatted = dateString.includes(' ') && !dateString.includes('T')
      ? dateString.replace(' ', 'T') + 'Z' 
      : dateString;
    const date = new Date(dateStrFormatted);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Clear all filters
  const handleClearFilters = () => {
    setSearchId('');
    setSearchTable('');
    setStartDate('');
    setEndDate('');
    setStatusFilter('all');
    setPaymentFilter('all');
  };

  // Filter & Sort Logic: Only served, completed, or cancelled orders belong in history
  // Also apply searches, dates and sort newest first (DESC)
  const filteredOrders = useMemo(() => {
    let result = orders.filter(o => 
      o.status === 'served' || o.status === 'completed' || o.status === 'cancelled'
    );

    // 1. Search by Order ID
    if (searchId.trim() !== '') {
      const q = searchId.trim().toLowerCase();
      result = result.filter(o => String(o.id).includes(q));
    }

    // 2. Search by Table Number
    if (searchTable.trim() !== '') {
      const q = searchTable.trim().toLowerCase();
      result = result.filter(o => String(o.tableNumber).toLowerCase().includes(q));
    }

    // 3. Date Filters
    if (startDate) {
      result = result.filter(o => {
        const orderDateStr = o.createdAt.split(' ')[0] || o.createdAt.split('T')[0];
        return orderDateStr >= startDate;
      });
    }

    if (endDate) {
      result = result.filter(o => {
        const orderDateStr = o.createdAt.split(' ')[0] || o.createdAt.split('T')[0];
        return orderDateStr <= endDate;
      });
    }

    // 4. Status Filter
    if (statusFilter !== 'all') {
      result = result.filter(o => o.status === statusFilter);
    }

    // 5. Payment Filter
    if (paymentFilter !== 'all') {
      result = result.filter(o => o.paymentStatus === paymentFilter);
    }

    // Sort newest first (by id or createdAt descending)
    return result.sort((a, b) => b.id - a.id);
  }, [orders, searchId, searchTable, startDate, endDate, statusFilter, paymentFilter]);

  return (
    <section className="order-history-section" style={{
      background: 'var(--bg-card)',
      border: '1px solid rgba(255, 255, 255, 0.04)',
      borderRadius: 'var(--radius-lg)',
      padding: '28px',
      boxShadow: 'var(--shadow-premium)',
      display: 'flex',
      flexDirection: 'column',
      gap: '24px'
    }}>
      {/* Header */}
      <div className="section-header-action" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        paddingBottom: '16px',
        marginBottom: '0'
      }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '20px', fontWeight: '700' }}>
            Archived Order History
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Permanently saved records of served and completed customer orders.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={handleExportCSV} style={{
            background: 'rgba(20, 184, 166, 0.08)',
            border: '1px solid rgba(20, 184, 166, 0.25)',
            color: 'var(--accent-teal)',
            padding: '10px 16px',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontFamily: 'var(--font-title)',
            fontWeight: '600',
            fontSize: '13px'
          }}>
            <Download size={14} />
            <span>Today's CSV</span>
          </button>
          
          <button onClick={handleExportPDF} style={{
            background: 'var(--accent-teal)',
            border: 'none',
            color: '#000',
            padding: '10px 16px',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontFamily: 'var(--font-title)',
            fontWeight: '800',
            fontSize: '13px',
            boxShadow: '0 4px 10px rgba(20, 184, 166, 0.2)'
          }}>
            <Download size={14} />
            <span>Today's PDF</span>
          </button>

          <button onClick={handleDeleteAllHistory} style={{
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            color: 'var(--accent-rose)',
            padding: '10px 16px',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontFamily: 'var(--font-title)',
            fontWeight: '600',
            fontSize: '13px',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'}
          >
            <Trash2 size={14} />
            <span>Delete All History</span>
          </button>

          <button className="refresh-kitchen-btn" onClick={fetchOrders} style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            color: 'var(--text-main)',
            padding: '10px 16px',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontFamily: 'var(--font-title)',
            fontWeight: '600',
            fontSize: '13px'
          }}>
            <RotateCw size={14} className={loading ? 'spin' : ''} />
            <span>Refresh Records</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="history-filters-bar" style={{
        background: 'rgba(255, 255, 255, 0.01)',
        border: '1px solid rgba(255, 255, 255, 0.03)',
        borderRadius: 'var(--radius-md)',
        padding: '16px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        alignItems: 'end'
      }}>
        {/* Search by ID */}
        <div className="filter-item" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Search Order ID</label>
          <div className="search-box-container" style={{ width: '100%', maxWidth: 'none', background: 'rgba(255, 255, 255, 0.02)' }}>
            <Search className="search-icon" size={14} />
            <input 
              type="text" 
              placeholder="e.g. 104"
              value={searchId}
              onChange={e => setSearchId(e.target.value)}
              className="search-input"
              style={{ fontSize: '13px' }}
            />
          </div>
        </div>

        {/* Search by Table */}
        <div className="filter-item" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Search Table Number</label>
          <div className="search-box-container" style={{ width: '100%', maxWidth: 'none', background: 'rgba(255, 255, 255, 0.02)' }}>
            <Search className="search-icon" size={14} />
            <input 
              type="text" 
              placeholder="e.g. 5"
              value={searchTable}
              onChange={e => setSearchTable(e.target.value)}
              className="search-input"
              style={{ fontSize: '13px' }}
            />
          </div>
        </div>

        {/* Start Date */}
        <div className="filter-item" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>From Date</label>
          <div className="search-box-container" style={{ width: '100%', maxWidth: 'none', background: 'rgba(255, 255, 255, 0.02)', padding: '2px 10px' }}>
            <Calendar size={14} style={{ color: 'var(--text-muted)', marginRight: '8px' }} />
            <input 
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="search-input"
              style={{ fontSize: '13px', colorScheme: 'dark' }}
            />
          </div>
        </div>

        {/* End Date */}
        <div className="filter-item" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>To Date</label>
          <div className="search-box-container" style={{ width: '100%', maxWidth: 'none', background: 'rgba(255, 255, 255, 0.02)', padding: '2px 10px' }}>
            <Calendar size={14} style={{ color: 'var(--text-muted)', marginRight: '8px' }} />
            <input 
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="search-input"
              style={{ fontSize: '13px', colorScheme: 'dark' }}
            />
          </div>
        </div>

        {/* Status Filter */}
        <div className="filter-item" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Order Status</label>
          <div className="search-box-container" style={{ width: '100%', maxWidth: 'none', background: 'rgba(255, 255, 255, 0.02)', padding: '2px 10px' }}>
            <CheckCircle2 size={14} style={{ color: 'var(--text-muted)', marginRight: '8px' }} />
            <select 
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="search-input"
              style={{ fontSize: '13px', background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-main)', width: '100%', colorScheme: 'dark' }}
            >
              <option value="all" style={{ background: '#1c1c1e' }}>All Statuses</option>
              <option value="served" style={{ background: '#1c1c1e' }}>Served</option>
              <option value="completed" style={{ background: '#1c1c1e' }}>Completed</option>
              <option value="cancelled" style={{ background: '#1c1c1e' }}>Cancelled</option>
            </select>
          </div>
        </div>

        {/* Payment Filter */}
        <div className="filter-item" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Payment Status</label>
          <div className="search-box-container" style={{ width: '100%', maxWidth: 'none', background: 'rgba(255, 255, 255, 0.02)', padding: '2px 10px' }}>
            <DollarSign size={14} style={{ color: 'var(--text-muted)', marginRight: '8px' }} />
            <select 
              value={paymentFilter}
              onChange={e => setPaymentFilter(e.target.value)}
              className="search-input"
              style={{ fontSize: '13px', background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-main)', width: '100%', colorScheme: 'dark' }}
            >
              <option value="all" style={{ background: '#1c1c1e' }}>All Payments</option>
              <option value="Paid" style={{ background: '#1c1c1e' }}>Paid</option>
              <option value="Unpaid" style={{ background: '#1c1c1e' }}>Unpaid</option>
            </select>
          </div>
        </div>

        {/* Clear Filters */}
        {(searchId || searchTable || startDate || endDate || statusFilter !== 'all' || paymentFilter !== 'all') && (
          <button 
            onClick={handleClearFilters}
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
            onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-rose)'}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
              e.currentTarget.style.color = 'var(--accent-rose)';
            }}
            onMouseDown={e => e.currentTarget.style.color = '#000'}
            onMouseUp={e => e.currentTarget.style.color = 'var(--accent-rose)'}
          >
            <FilterX size={14} />
            <span>Clear Filters</span>
          </button>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="dashboard-error-banner" style={{ margin: '0 0 20px 0' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* History Grid/List */}
      <div className="history-records-container" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {loading && orders.length === 0 ? (
          <div className="loader-box"><div className="spinner"></div></div>
        ) : filteredOrders.length === 0 ? (
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
                <Archive size={32} style={{ color: 'var(--accent-teal)' }} />
              </div>
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-main)', margin: '0 0 8px 0' }}>
              No completed orders yet.
            </h3>
            
            <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', maxWidth: '340px', margin: '0', lineHeight: '1.5' }}>
              Served or completed order tickets will be stored here. Adjust filters or search terms to inspect other records.
            </p>
          </div>
        ) : (
          filteredOrders.map(order => {
            const isExpanded = expandedOrderId === order.id;
            
            return (
              <div 
                key={order.id} 
                className={`order-card history-card status-${order.status}`}
                style={{
                  background: 'rgba(255, 255, 255, 0.01)',
                  border: '1px solid rgba(255, 255, 255, 0.04)',
                  borderLeft: `4px solid ${order.status === 'cancelled' ? 'var(--text-muted)' : 'var(--accent-emerald)'}`,
                  borderRadius: 'var(--radius-md)',
                  padding: '16px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: isExpanded ? '0 10px 20px rgba(0,0,0,0.3)' : 'none'
                }}
                onClick={() => toggleExpand(order.id)}
              >
                {/* Summary Row */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'var(--font-title)', fontWeight: '750', fontSize: '15px' }}>
                      Order #000{order.id}
                    </span>
                    <span style={{
                      background: 'rgba(20, 184, 166, 0.1)',
                      border: '1px solid rgba(20, 184, 166, 0.2)',
                      fontSize: '12px',
                      fontWeight: '700',
                      padding: '2px 10px',
                      borderRadius: '4px',
                      color: 'var(--accent-teal)'
                    }}>
                      Table {order.tableNumber}
                    </span>
                    <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                      {formatDateTime(order.createdAt)}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                    {/* Status Badge */}
                    <span className={`status-pill ${order.status}`} style={{ textTransform: 'uppercase' }}>
                      {order.status === 'served' ? 'Served' : order.status}
                    </span>

                    {/* Payment Badge */}
                    <span style={{
                      fontSize: '10px',
                      fontWeight: '800',
                      padding: '4px 8px',
                      borderRadius: '20px',
                      letterSpacing: '0.5px',
                      background: order.paymentStatus === 'Paid' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      color: order.paymentStatus === 'Paid' ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                      border: `1.5px solid ${order.paymentStatus === 'Paid' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
                    }}>
                      {order.paymentStatus.toUpperCase()}
                    </span>

                    {/* Price */}
                    <span style={{ fontFamily: 'var(--font-title)', fontWeight: '800', color: 'var(--accent-teal)', fontSize: '16px' }}>
                      {settings.currencySymbol || '₹'}{order.totalAmount}
                    </span>

                    {/* Chevron toggler */}
                    <button style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                  </div>
                </div>

                {/* Collapsed Items Preview */}
                {!isExpanded && (
                  <div style={{ 
                    fontSize: '13px', 
                    color: 'var(--text-muted)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    borderTop: '1px solid rgba(255, 255, 255, 0.02)',
                    paddingTop: '8px'
                  }}>
                    {order.items.map(it => `${it.quantity}x ${it.name}`).join(', ')}
                  </div>
                )}

                {/* Expanded Details Panel */}
                {isExpanded && (
                  <div 
                    onClick={e => e.stopPropagation()} // Prevent collapse when clicking details
                    style={{
                      borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                      paddingTop: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '20px',
                      cursor: 'default'
                    }}
                  >
                    {/* Itemized Table and Timeline */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
                      
                      {/* Left: Item list */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <h4 style={{ fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>
                          Ordered Items
                        </h4>
                        <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)', padding: '12px' }}>
                          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {order.items.map((item, idx) => (
                              <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px' }}>
                                <span>
                                  <span style={{ fontWeight: '700', color: 'var(--accent-teal)', marginRight: '8px' }}>{item.quantity}x</span>
                                  <span>{item.name}</span>
                                </span>
                                <span style={{ color: 'var(--text-muted)' }}>
                                  {settings.currencySymbol || '₹'}{item.price} ea = <span style={{ color: 'var(--text-main)', fontWeight: '600' }}>{settings.currencySymbol || '₹'}{item.price * item.quantity}</span>
                                </span>
                              </li>
                            ))}
                          </ul>
                          <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '10px 0' }}></div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14.5px', fontWeight: '700' }}>
                            <span>Grand Total</span>
                            <span style={{ color: 'var(--accent-teal)' }}>{settings.currencySymbol || '₹'}{order.totalAmount}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Timeline */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <h4 style={{ fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>
                          Workflow Progression Timeline
                        </h4>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingLeft: '8px', position: 'relative' }}>
                          {/* Timeline vertical bar */}
                          <div style={{
                            position: 'absolute',
                            left: '16px',
                            top: '8px',
                            bottom: '8px',
                            width: '2px',
                            background: 'rgba(255,255,255,0.05)'
                          }}></div>

                          {/* Created */}
                          <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', position: 'relative' }}>
                            <div style={{
                              width: '18px', height: '18px', borderRadius: '50%', background: 'var(--accent-amber)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1, marginTop: '2px',
                              boxShadow: '0 0 8px rgba(245, 158, 11, 0.4)'
                            }}>
                              <Clock size={10} color="#000" />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', fontSize: '13px' }}>
                              <span style={{ fontWeight: '600' }}>Placed / Created</span>
                              <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{formatDateTime(order.createdAt)}</span>
                            </div>
                          </div>

                          {/* Accepted */}
                          <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', position: 'relative' }}>
                            <div style={{
                              width: '18px', height: '18px', borderRadius: '50%', 
                              background: order.acceptedAt ? 'var(--accent-blue)' : 'rgba(255,255,255,0.05)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1, marginTop: '2px'
                            }}>
                              <CheckCircle2 size={10} color={order.acceptedAt ? '#fff' : 'var(--text-muted)'} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', fontSize: '13px' }}>
                              <span style={{ fontWeight: '600', color: order.acceptedAt ? 'var(--text-main)' : 'var(--text-muted)' }}>Accepted by Kitchen</span>
                              <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{formatDateTime(order.acceptedAt)}</span>
                            </div>
                          </div>

                          {/* Ready */}
                          <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', position: 'relative' }}>
                            <div style={{
                              width: '18px', height: '18px', borderRadius: '50%', 
                              background: order.readyAt ? 'var(--accent-teal)' : 'rgba(255,255,255,0.05)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1, marginTop: '2px'
                            }}>
                              <CheckCircle2 size={10} color={order.readyAt ? '#000' : 'var(--text-muted)'} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', fontSize: '13px' }}>
                              <span style={{ fontWeight: '600', color: order.readyAt ? 'var(--text-main)' : 'var(--text-muted)' }}>Food Ready</span>
                              <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{formatDateTime(order.readyAt)}</span>
                            </div>
                          </div>

                          {/* Served */}
                          <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', position: 'relative' }}>
                            <div style={{
                              width: '18px', height: '18px', borderRadius: '50%', 
                              background: order.servedAt ? 'var(--accent-emerald)' : 'rgba(255,255,255,0.05)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1, marginTop: '2px'
                            }}>
                              <CheckCircle2 size={10} color={order.servedAt ? '#000' : 'var(--text-muted)'} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', fontSize: '13px' }}>
                              <span style={{ fontWeight: '600', color: order.servedAt ? 'var(--text-main)' : 'var(--text-muted)' }}>Served / Fulfilled</span>
                              <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{formatDateTime(order.servedAt)}</span>
                            </div>
                          </div>

                        </div>
                      </div>

                    </div>

                    {/* Actions Panel */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.04)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '12px 18px',
                      marginTop: '8px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>
                        <Info size={16} style={{ color: 'var(--accent-teal)' }} />
                        <span>Order status is locked as <strong>{order.status.toUpperCase()}</strong>. You can modify payment status.</span>
                      </div>

                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button 
                          onClick={() => handleDeleteOrder(order.id)}
                          style={{
                            background: 'rgba(239, 68, 68, 0.08)',
                            border: '1px solid rgba(239, 68, 68, 0.25)',
                            color: 'var(--accent-rose)',
                            padding: '8px 16px',
                            borderRadius: '8px',
                            fontSize: '12.5px',
                            fontWeight: '700',
                            fontFamily: 'var(--font-title)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'}
                        >
                          <Trash2 size={14} />
                          <span>Delete Order</span>
                        </button>

                        <button 
                          onClick={() => handleTogglePayment(order.id, order.paymentStatus)}
                          style={{
                            background: order.paymentStatus === 'Paid' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                            border: `1px solid ${order.paymentStatus === 'Paid' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.25)'}`,
                            color: order.paymentStatus === 'Paid' ? 'var(--accent-rose)' : 'var(--accent-emerald)',
                            padding: '8px 16px',
                            borderRadius: '8px',
                            fontSize: '12.5px',
                            fontWeight: '700',
                            fontFamily: 'var(--font-title)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <DollarSign size={14} />
                          <span>Mark as {order.paymentStatus === 'Paid' ? 'Unpaid' : 'Paid'}</span>
                        </button>
                      </div>
                    </div>

                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

export default OrderHistoryPage;
