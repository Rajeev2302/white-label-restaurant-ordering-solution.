import React, { useState, useMemo } from 'react';
import {
  LayoutDashboard,
  Utensils,
  PlusCircle,
  Play,
  QrCode,
  Wrench,
  Database,
  Settings,
  Search,
  Bell,
  User,
  ExternalLink,
  Sliders,
  TrendingUp,
  Activity,
  DollarSign,
  AlertCircle,
  Trash2,
  Edit3,
  CheckCircle,
  X,
  RefreshCw,
  FolderOpen,
  Calendar,
  Phone,
  FileText
} from 'lucide-react';

// Initial Mock Data representing SaaS Tenants (Restaurants)
const INITIAL_RESTAURANTS = [
  {
    id: 1,
    name: 'Lakshmi Ganesh Restaurant',
    owner: 'Rajeev Kumar',
    phone: '+91 98765 43210',
    status: 'Active',
    created: '2026-06-20',
    logo: 'LG',
    theme: '#d4af37'
  },
  {
    id: 2,
    name: 'Royal Biryani House',
    owner: 'Anand Sharma',
    phone: '+91 91234 56789',
    status: 'Active',
    created: '2026-06-22',
    logo: 'RB',
    theme: '#ef4444'
  },
  {
    id: 3,
    name: 'Southern Spice',
    owner: 'K. Venkatesh',
    phone: '+91 88990 12345',
    status: 'Trial',
    created: '2026-06-25',
    logo: 'SS',
    theme: '#10b981'
  },
  {
    id: 4,
    name: 'Pizza & Pasta Bistro',
    owner: 'Sanjay Dutt',
    phone: '+91 77665 54433',
    status: 'Pending Setup',
    created: '2026-06-28',
    logo: 'PP',
    theme: '#f59e0b'
  },
  {
    id: 5,
    name: 'The Green Leaf Café',
    owner: 'Meera Rao',
    phone: '+91 99887 76655',
    status: 'Suspended',
    created: '2026-06-05',
    logo: 'GL',
    theme: '#3b82f6'
  }
];

// Initial Deployments Mock Data
const INITIAL_DEPLOYMENTS = [
  { id: 'dep-1025', app: 'Customer App', version: 'v1.4.2', status: 'Live', time: '2026-06-27 15:45' },
  { id: 'dep-1024', app: 'Staff Dashboard', version: 'v1.2.0', status: 'Live', time: '2026-06-27 15:40' },
  { id: 'dep-1023', app: 'Kitchen App', version: 'v1.1.1', status: 'Live', time: '2026-06-27 15:35' },
  { id: 'dep-1022', app: 'API Server', version: 'v2.0.1', status: 'Live', time: '2026-06-27 13:30' }
];

export default function App() {
  const [selectedTab, setSelectedTab] = useState('dashboard');
  const [restaurants, setRestaurants] = useState(INITIAL_RESTAURANTS);
  const [deployments, setDeployments] = useState(INITIAL_DEPLOYMENTS);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Feed / System Logs Notification state
  const [notifications, setNotifications] = useState([
    { id: 1, text: 'Lakshmi Ganesh Restaurant placed active order #102', time: '2 mins ago' },
    { id: 2, text: 'PWA update deployed successfully for Staff Dashboard', time: '10 mins ago' },
    { id: 3, text: 'Database automated backup completed successfully', time: '1 hour ago' }
  ]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Form states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  
  // Selected resource for action modals
  const [activeRestaurant, setActiveRestaurant] = useState(null);

  // Toast notification feedback
  const [toastMessage, setToastMessage] = useState(null);

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Add Restaurant form fields
  const [newName, setNewName] = useState('');
  const [newOwner, setNewOwner] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newStatus, setNewStatus] = useState('Active');
  const [newLogo, setNewLogo] = useState('');

  // QR bulk generator fields
  const [qrCount, setQrCount] = useState(10);
  const [generatedQrs, setGeneratedQrs] = useState(null);

  // Edit Restaurant form fields
  const [editName, setEditName] = useState('');
  const [editOwner, setEditOwner] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editStatus, setEditStatus] = useState('');

  // Deployment form fields
  const [deployApp, setDeployApp] = useState('Customer App');
  const [deployBranch, setDeployBranch] = useState('main');

  // Filtered restaurants for search bar
  const filteredRestaurants = useMemo(() => {
    return restaurants.filter(r => 
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.owner.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.phone.includes(searchQuery)
    );
  }, [restaurants, searchQuery]);

  // Calculated KPI stats
  const stats = useMemo(() => {
    const total = restaurants.length;
    const active = restaurants.filter(r => r.status === 'Active').length;
    const renewals = restaurants.filter(r => r.status === 'Trial' || r.status === 'Pending Setup').length;
    // Mock monthly revenue ($150 per active tenant + $50 per trial)
    const revenue = (active * 150) + (restaurants.filter(r => r.status === 'Trial').length * 50);
    return { total, active, renewals, revenue };
  }, [restaurants]);

  // Action handlers
  const handleAddRestaurant = (e) => {
    e.preventDefault();
    if (!newName.trim() || !newOwner.trim()) {
      triggerToast('Restaurant Name and Owner are required!');
      return;
    }
    const newId = restaurants.length > 0 ? Math.max(...restaurants.map(r => r.id)) + 1 : 1;
    const logoInitials = newLogo.trim() || newName.trim().split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    
    const item = {
      id: newId,
      name: newName,
      owner: newOwner,
      phone: newPhone || '+91 99999 88888',
      status: newStatus,
      created: new Date().toISOString().split('T')[0],
      logo: logoInitials,
      theme: '#d4af37'
    };

    setRestaurants([...restaurants, item]);
    setShowAddModal(false);
    triggerToast(`Restaurant "${newName}" added successfully!`);
    
    // Reset fields
    setNewName('');
    setNewOwner('');
    setNewPhone('');
    setNewStatus('Active');
    setNewLogo('');
  };

  const handleOpenEdit = (res) => {
    setActiveRestaurant(res);
    setEditName(res.name);
    setEditOwner(res.owner);
    setEditPhone(res.phone);
    setEditStatus(res.status);
    setShowEditModal(true);
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    setRestaurants(restaurants.map(r => 
      r.id === activeRestaurant.id 
        ? { ...r, name: editName, owner: editOwner, phone: editPhone, status: editStatus }
        : r
    ));
    setShowEditModal(false);
    triggerToast('Restaurant settings updated.');
  };

  const handleDeleteConfirm = () => {
    setRestaurants(restaurants.filter(r => r.id !== activeRestaurant.id));
    setShowDeleteModal(false);
    triggerToast(`Permanently deleted "${activeRestaurant.name}".`);
  };

  const handleTriggerDeploy = (e) => {
    e.preventDefault();
    const newId = `dep-${Math.floor(1000 + Math.random() * 9000)}`;
    const newDeploy = {
      id: newId,
      app: deployApp,
      version: `v${(1 + Math.random() * 2).toFixed(1)}.${Math.floor(Math.random() * 9)}`,
      status: 'Live',
      time: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };
    setDeployments([newDeploy, ...deployments]);
    setShowDeployModal(false);
    triggerToast(`Deployment launched for ${deployApp}!`);
  };

  const handleGenerateQrs = (e) => {
    e.preventDefault();
    const mockQrs = Array.from({ length: qrCount }, (_, i) => ({
      table: i + 1,
      code: `https://serveqr-customer.onrender.com/?t=${i + 1}&r=${activeRestaurant?.id || 1}`,
    }));
    setGeneratedQrs(mockQrs);
    triggerToast(`Generated ${qrCount} table QR codes!`);
  };

  return (
    <div className="min-h-screen flex bg-[#030303] text-gray-300 font-sans">
      
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 glass-card bg-black/90 border-[#D4AF37] px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 animate-fade-in">
          <CheckCircle className="text-[#D4AF37] w-5 h-5" />
          <span className="text-white font-medium">{toastMessage}</span>
        </div>
      )}

      {/* --- LEFT SIDEBAR --- */}
      <aside className="w-64 border-r border-gray-900 bg-[#060608] flex flex-col justify-between shrink-0">
        <div>
          {/* Logo Brand */}
          <div className="h-16 flex items-center px-6 gap-3 border-b border-gray-900/60">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#D4AF37] to-[#aa8c2c] flex items-center justify-center shadow-lg shadow-[#D4AF37]/10">
              <QrCode className="text-black w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-white tracking-wide text-lg font-title block">ServeQR</span>
              <span className="text-[10px] text-[#D4AF37] font-semibold uppercase tracking-wider block">Admin Control</span>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="p-4 space-y-1">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
              { id: 'restaurants', label: 'Restaurants', icon: Utensils },
              { id: 'new-restaurant', label: 'New Restaurant', icon: PlusCircle },
              { id: 'deployments', label: 'Deployments', icon: Play },
              { id: 'qr-generator', label: 'QR Generator', icon: QrCode },
              { id: 'maintenance', label: 'Maintenance', icon: Wrench },
              { id: 'backups', label: 'Backups', icon: Database },
              { id: 'settings', label: 'Settings', icon: Sliders }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = selectedTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSelectedTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-rgba(212, 175, 55, 0.08) to-transparent border-l-2 border-[#D4AF37] text-white bg-[#121215]/60'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#D4AF37]' : 'text-gray-500'}`} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Info Foot */}
        <div className="p-4 border-t border-gray-900/60 bg-black/35">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center">
              <User className="w-4 h-4 text-[#D4AF37]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Owner Admin</p>
              <p className="text-xs text-gray-500">admin@serveqr.com</p>
            </div>
          </div>
        </div>
      </aside>

      {/* --- MAIN PAGE CONTENT CONTAINER --- */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* --- TOP NAVBAR --- */}
        <header className="h-16 border-b border-gray-900/80 bg-[#060608]/90 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-30">
          {/* Search bar */}
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
            <input
              type="text"
              placeholder="Search active restaurants..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full glass-input pl-10 pr-4 text-sm"
            />
          </div>

          {/* Right Header Navigation */}
          <div className="flex items-center gap-4">
            
            {/* Notifications Feed */}
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="w-10 h-10 rounded-lg bg-neutral-900/60 border border-neutral-800 flex items-center justify-center text-gray-400 hover:text-white transition-all relative"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#D4AF37]"></span>
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 glass-card bg-neutral-950/95 border-neutral-800 shadow-2xl p-4 z-50">
                  <div className="flex justify-between items-center pb-2 border-b border-neutral-900 mb-3">
                    <span className="text-xs font-semibold text-white uppercase tracking-wider">Live System Logs</span>
                    <button onClick={() => setShowNotifications(false)} className="text-gray-500 hover:text-white">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="space-y-3">
                    {notifications.map(n => (
                      <div key={n.id} className="text-xs border-b border-neutral-900/40 pb-2">
                        <p className="text-gray-300">{n.text}</p>
                        <span className="text-[10px] text-gray-600">{n.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Dropdown Indicator */}
            <div className="flex items-center gap-2 pl-2 border-l border-neutral-900">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-600 to-[#D4AF37] text-black font-semibold text-xs flex items-center justify-center">
                OP
              </div>
              <span className="text-xs font-semibold text-white hidden md:inline">Developer Console</span>
            </div>
          </div>
        </header>

        {/* --- MAIN PAGE TABS --- */}
        <main className="flex-1 p-8 overflow-y-auto">
          
          {/* TAB 1: DASHBOARD HOME */}
          {selectedTab === 'dashboard' && (
            <div className="space-y-8 animate-fade-in">
              
              {/* Title Section */}
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-3xl font-extrabold text-white tracking-tight">SaaS Console</h1>
                  <p className="text-sm text-gray-500">Overview of active subscriptions, monthly revenue, and active QR instances.</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => { setSelectedTab('deployments'); setShowDeployModal(true); }} className="gold-glow-btn">
                    <Play className="w-4 h-4 fill-black" />
                    New Deployment
                  </button>
                </div>
              </div>

              {/* Stat Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                
                {/* Stat 1 */}
                <div className="glass-card p-6 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Total Restaurants</span>
                    <span className="text-3xl font-bold text-white block mt-1">{stats.total}</span>
                    <span className="text-xs text-[#D4AF37] font-medium block mt-2">↑ 2 new this week</span>
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center text-[#D4AF37]">
                    <Utensils className="w-5 h-5" />
                  </div>
                </div>

                {/* Stat 2 */}
                <div className="glass-card p-6 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Active Licenses</span>
                    <span className="text-3xl font-bold text-white block mt-1">{stats.active}</span>
                    <span className="text-xs text-emerald-500 font-medium block mt-2">91% active runtime</span>
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center text-emerald-500">
                    <Activity className="w-5 h-5" />
                  </div>
                </div>

                {/* Stat 3 */}
                <div className="glass-card p-6 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Monthly MRR</span>
                    <span className="text-3xl font-bold text-white block mt-1">₹{stats.revenue.toLocaleString()}</span>
                    <span className="text-xs text-[#D4AF37] font-medium block mt-2">↑ 12.5% from May</span>
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center text-[#D4AF37]">
                    <DollarSign className="w-5 h-5" />
                  </div>
                </div>

                {/* Stat 4 */}
                <div className="glass-card p-6 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Pending Renewals</span>
                    <span className="text-3xl font-bold text-white block mt-1">{stats.renewals}</span>
                    <span className="text-xs text-amber-500 font-medium block mt-2">Requires attention</span>
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center text-amber-500">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                </div>

              </div>

              {/* Main Content Grid (Table + Right Action Pane) */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                
                {/* Left table */}
                <div className="lg:col-span-3 space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-[#D4AF37]" />
                      Tenant Listing
                    </h3>
                    <span className="text-xs text-gray-500">Showing {filteredRestaurants.length} items</span>
                  </div>

                  <div className="glass-card overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-gray-900/60 bg-neutral-900/20 text-gray-500 text-xs uppercase font-semibold">
                          <th className="py-4 px-6">Restaurant</th>
                          <th className="py-4 px-6">Owner</th>
                          <th className="py-4 px-6">Phone</th>
                          <th className="py-4 px-6">Status</th>
                          <th className="py-4 px-6">Created Date</th>
                          <th className="py-4 px-6 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRestaurants.map(res => (
                          <tr key={res.id} className="border-b border-gray-900/30 hover:bg-neutral-900/10 transition-all text-sm">
                            <td className="py-4 px-6 flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center text-xs font-bold text-white">
                                {res.logo}
                              </div>
                              <span className="font-semibold text-white">{res.name}</span>
                            </td>
                            <td className="py-4 px-6">{res.owner}</td>
                            <td className="py-4 px-6 text-gray-400">{res.phone}</td>
                            <td className="py-4 px-6">
                              <span className={`status-badge ${
                                res.status === 'Active' ? 'status-active' :
                                res.status === 'Suspended' ? 'status-suspended' :
                                res.status === 'Trial' ? 'status-trial' : 'status-pending'
                              }`}>
                                {res.status}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-gray-500">{res.created}</td>
                            <td className="py-4 px-6">
                              <div className="flex items-center justify-center gap-2">
                                <button 
                                  onClick={() => triggerToast(`Navigating to ${res.name} portal...`)}
                                  className="p-2 rounded hover:bg-neutral-900 text-gray-400 hover:text-white"
                                  title="Open portal"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  onClick={() => handleOpenEdit(res)}
                                  className="p-2 rounded hover:bg-neutral-900 text-gray-400 hover:text-white"
                                  title="Edit"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  onClick={() => { setActiveRestaurant(res); setShowDeleteModal(true); }}
                                  className="p-2 rounded hover:bg-neutral-900 text-gray-400 hover:text-red-500"
                                  title="Delete"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Right action pane */}
                <div className="lg:col-span-1 space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-white mb-4">Quick Actions</h3>
                    
                    <div className="glass-card p-6 space-y-3">
                      
                      <button 
                        onClick={() => setShowAddModal(true)} 
                        className="w-full dark-btn flex items-center justify-between text-left"
                      >
                        <span className="flex items-center gap-2">
                          <PlusCircle className="w-4 h-4 text-[#D4AF37]" />
                          Add Restaurant
                        </span>
                        <span className="text-[10px] text-gray-600">NEW</span>
                      </button>

                      <button 
                        onClick={() => {
                          const activeRes = restaurants.find(r => r.status === 'Active') || restaurants[0];
                          setActiveRestaurant(activeRes);
                          setShowQrModal(true);
                        }} 
                        className="w-full dark-btn flex items-center justify-between text-left"
                      >
                        <span className="flex items-center gap-2">
                          <QrCode className="w-4 h-4 text-emerald-500" />
                          Generate QR Codes
                        </span>
                        <span className="text-[10px] text-gray-600">BULK</span>
                      </button>

                      <button 
                        onClick={() => setShowDeployModal(true)} 
                        className="w-full dark-btn flex items-center justify-between text-left"
                      >
                        <span className="flex items-center gap-2">
                          <Play className="w-4 h-4 text-[#D4AF37] fill-[#D4AF37]" />
                          New Deployment
                        </span>
                        <span className="text-[10px] text-gray-600">LIVE</span>
                      </button>

                      <button 
                        onClick={() => {
                          triggerToast('Initiating total database backup...');
                          setNotifications([
                            { id: Date.now(), text: 'Manual platform database backup triggered', time: 'Just now' },
                            ...notifications
                          ]);
                        }} 
                        className="w-full dark-btn flex items-center justify-between text-left"
                      >
                        <span className="flex items-center gap-2">
                          <Database className="w-4 h-4 text-blue-500" />
                          Backup Platform
                        </span>
                        <span className="text-[10px] text-gray-600">SQL</span>
                      </button>

                      <button 
                        onClick={() => {
                          triggerToast('Database restored to last automated state.');
                        }} 
                        className="w-full dark-btn flex items-center justify-between text-left"
                      >
                        <span className="flex items-center gap-2">
                          <RefreshCw className="w-4 h-4 text-amber-500" />
                          Restore Backup
                        </span>
                        <span className="text-[10px] text-gray-600">RESTORE</span>
                      </button>

                    </div>
                  </div>

                  {/* System Health Status */}
                  <div className="glass-card p-6 space-y-4">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Service Health Status</span>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-xs">
                        <span>API Server</span>
                        <span className="text-emerald-500 font-semibold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                          Operational
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span>PostgreSQL DB</span>
                        <span className="text-emerald-500 font-semibold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                          Connected
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span>Render Redis</span>
                        <span className="text-emerald-500 font-semibold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                          Connected
                        </span>
                      </div>
                    </div>
                  </div>

                </div>

              </div>

            </div>
          )}

          {/* TAB 2: RESTAURANTS LIST */}
          {selectedTab === 'restaurants' && (
            <div className="space-y-8 animate-fade-in">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-3xl font-extrabold text-white">Restaurants Management</h1>
                  <p className="text-sm text-gray-500">Edit and monitor your hosted restaurant licenses and statuses.</p>
                </div>
                <button onClick={() => setShowAddModal(true)} className="gold-glow-btn">
                  <PlusCircle className="w-4 h-4" />
                  Add Restaurant
                </button>
              </div>

              <div className="glass-card p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredRestaurants.map(r => (
                    <div key={r.id} className="border border-neutral-900 bg-neutral-950/40 rounded-xl p-6 space-y-4 hover:border-neutral-800 transition-all">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-neutral-800 flex items-center justify-center font-bold text-white text-sm">
                            {r.logo}
                          </div>
                          <div>
                            <h4 className="font-bold text-white leading-tight">{r.name}</h4>
                            <span className="text-xs text-gray-500">ID: tenant-{1000 + r.id}</span>
                          </div>
                        </div>
                        <span className={`status-badge ${
                          r.status === 'Active' ? 'status-active' :
                          r.status === 'Suspended' ? 'status-suspended' :
                          r.status === 'Trial' ? 'status-trial' : 'status-pending'
                        }`}>
                          {r.status}
                        </span>
                      </div>

                      <div className="space-y-2 text-xs text-gray-400">
                        <div className="flex justify-between">
                          <span>Owner:</span>
                          <span className="text-white font-medium">{r.owner}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Phone:</span>
                          <span className="text-white font-medium">{r.phone}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Created:</span>
                          <span className="text-white font-medium">{r.created}</span>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2 border-t border-neutral-900/60">
                        <button onClick={() => handleOpenEdit(r)} className="flex-1 dark-btn text-xs justify-center py-2">
                          <Edit3 className="w-3 h-3" />
                          Edit
                        </button>
                        <button onClick={() => { setActiveRestaurant(r); setShowQrModal(true); }} className="dark-btn p-2">
                          <QrCode className="w-3.5 h-3.5 text-[#D4AF37]" />
                        </button>
                        <button onClick={() => { setActiveRestaurant(r); setShowDeleteModal(true); }} className="dark-btn p-2 hover:border-red-500">
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: NEW RESTAURANT FORM */}
          {selectedTab === 'new-restaurant' && (
            <div className="space-y-8 animate-fade-in max-w-2xl mx-auto">
              <div>
                <h1 className="text-3xl font-extrabold text-white">Add New Restaurant</h1>
                <p className="text-sm text-gray-500">Deploy a new white-label restaurant instance instantly.</p>
              </div>

              <div className="glass-card p-8">
                <form onSubmit={handleAddRestaurant} className="space-y-6">
                  
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-400 block">Restaurant Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Hyderabad House"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="w-full glass-input"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-400 block">Owner Full Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Ramesh Kumar"
                        value={newOwner}
                        onChange={(e) => setNewOwner(e.target.value)}
                        className="w-full glass-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-400 block">Phone Number</label>
                      <input
                        type="text"
                        placeholder="e.g. +91 99887 76655"
                        value={newPhone}
                        onChange={(e) => setNewPhone(e.target.value)}
                        className="w-full glass-input"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-400 block">Subscription Type</label>
                      <select
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value)}
                        className="w-full glass-input"
                      >
                        <option value="Active">Active (SaaS Premium)</option>
                        <option value="Trial">Free Trial (14-days)</option>
                        <option value="Pending Setup">Pending Setup</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-400 block">Logo Initials (2 chars max)</label>
                      <input
                        type="text"
                        maxLength="2"
                        placeholder="e.g. HH"
                        value={newLogo}
                        onChange={(e) => setNewLogo(e.target.value)}
                        className="w-full glass-input"
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-neutral-900 flex justify-end gap-3">
                    <button type="button" onClick={() => setSelectedTab('dashboard')} className="dark-btn">
                      Cancel
                    </button>
                    <button type="submit" className="gold-glow-btn">
                      Create & Deploy Instance
                    </button>
                  </div>

                </form>
              </div>
            </div>
          )}

          {/* TAB 4: DEPLOYMENTS */}
          {selectedTab === 'deployments' && (
            <div className="space-y-8 animate-fade-in">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-3xl font-extrabold text-white">CI/CD Deployments</h1>
                  <p className="text-sm text-gray-500">Monitor active builds, microservice revisions, and branch deployments.</p>
                </div>
                <button onClick={() => setShowDeployModal(true)} className="gold-glow-btn">
                  <Play className="w-4 h-4 fill-black" />
                  Deploy Service
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                <div className="glass-card p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-white text-sm">Deployment Mode</h4>
                    <span className="status-badge status-active">Automated</span>
                  </div>
                  <p className="text-xs text-gray-400">Deployments trigger automatically upon push to GitHub main branch.</p>
                </div>

                <div className="glass-card p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-white text-sm">Target Cloud</h4>
                    <span className="text-[#D4AF37] font-semibold text-xs">Render API</span>
                  </div>
                  <p className="text-xs text-gray-400">All frontends and backend containers are hosted via Render.</p>
                </div>

                <div className="glass-card p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-white text-sm">Build Status</h4>
                    <span className="text-emerald-500 font-semibold text-xs">All Passing</span>
                  </div>
                  <p className="text-xs text-gray-400">No active compiler warnings or test suite failures.</p>
                </div>

              </div>

              <div className="glass-card p-6">
                <h3 className="text-lg font-bold text-white mb-4">Deployment Log</h3>
                <div className="space-y-3">
                  {deployments.map(dep => (
                    <div key={dep.id} className="flex justify-between items-center p-4 border border-neutral-900 rounded-lg bg-neutral-950/20">
                      <div className="flex items-center gap-4">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                        <div>
                          <span className="font-bold text-white text-sm">{dep.app}</span>
                          <span className="text-xs text-gray-500 ml-2">({dep.version})</span>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 flex items-center gap-4">
                        <span>{dep.time}</span>
                        <span className="status-badge status-active">{dep.id}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: QR GENERATOR */}
          {selectedTab === 'qr-generator' && (
            <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
              <div>
                <h1 className="text-3xl font-extrabold text-white">QR Code Engine</h1>
                <p className="text-sm text-gray-500">Generate table dining QR codes containing embedded table IDs and restaurant tokens.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                
                <div className="glass-card p-6 space-y-6 md:col-span-1">
                  <h3 className="text-md font-bold text-white">Generator Config</h3>
                  
                  <form onSubmit={handleGenerateQrs} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-400 block">Select Restaurant</label>
                      <select
                        onChange={(e) => {
                          const res = restaurants.find(r => r.id === parseInt(e.target.value));
                          setActiveRestaurant(res);
                        }}
                        className="w-full glass-input"
                      >
                        {restaurants.map(r => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-400 block">Number of Tables</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={qrCount}
                        onChange={(e) => setQrCount(parseInt(e.target.value))}
                        className="w-full glass-input"
                      />
                    </div>

                    <button type="submit" className="w-full gold-glow-btn justify-center">
                      <QrCode className="w-4 h-4" />
                      Generate Batch
                    </button>
                  </form>
                </div>

                <div className="glass-card p-6 md:col-span-2 space-y-4">
                  <h3 className="text-md font-bold text-white">Generated Batch Results</h3>
                  
                  {generatedQrs ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-h-[300px] overflow-y-auto pr-2">
                      {generatedQrs.map(qr => (
                        <div key={qr.table} className="border border-neutral-900 rounded-lg p-4 bg-neutral-950/40 flex flex-col items-center gap-2">
                          <span className="text-xs font-semibold text-white">Table {qr.table}</span>
                          <div className="w-24 h-24 bg-white rounded p-1 flex items-center justify-center">
                            {/* Simple simulated QR code using lines */}
                            <div className="w-20 h-20 bg-neutral-900 rounded flex flex-wrap p-1 gap-1">
                              <div className="w-4 h-4 bg-white rounded-sm"></div>
                              <div className="w-4 h-4 bg-white rounded-sm"></div>
                              <div className="w-10 h-4 bg-white rounded-sm"></div>
                              <div className="w-8 h-4 bg-white rounded-sm"></div>
                              <div className="w-4.5 h-4 bg-white rounded-sm"></div>
                              <div className="w-4 h-4 bg-white rounded-sm"></div>
                              <div className="w-4 h-4 bg-white rounded-sm"></div>
                              <div className="w-10 h-4 bg-white rounded-sm"></div>
                            </div>
                          </div>
                          <button 
                            onClick={() => triggerToast(`Downloading QR code for Table ${qr.table}...`)}
                            className="dark-btn text-[10px] py-1 px-2.5 mt-1"
                          >
                            Download PNG
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-[200px] border border-dashed border-neutral-800 rounded-xl flex flex-col items-center justify-center text-gray-500 text-sm">
                      <QrCode className="w-8 h-8 text-neutral-800 mb-2" />
                      No batch generated. Configure the form on the left.
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* TAB 6: MAINTENANCE */}
          {selectedTab === 'maintenance' && (
            <div className="space-y-8 animate-fade-in max-w-3xl mx-auto">
              <div>
                <h1 className="text-3xl font-extrabold text-white">Platform Maintenance</h1>
                <p className="text-sm text-gray-500">Configure global downtime, purge server caches, and test system hooks.</p>
              </div>

              <div className="glass-card p-6 space-y-6">
                
                <div className="flex justify-between items-center p-4 border border-neutral-900 rounded-lg">
                  <div>
                    <h4 className="font-bold text-white text-sm">Maintenance Mode</h4>
                    <p className="text-xs text-gray-400">Block customer access and display "Downtime Scheduled" landing page.</p>
                  </div>
                  <button onClick={() => triggerToast('Maintenance mode toggled.')} className="dark-btn">
                    Toggle Mode
                  </button>
                </div>

                <div className="flex justify-between items-center p-4 border border-neutral-900 rounded-lg">
                  <div>
                    <h4 className="font-bold text-white text-sm">Purge Server Cache</h4>
                    <p className="text-xs text-gray-400">Flush all active Redis session mappings and menu assets query cache.</p>
                  </div>
                  <button onClick={() => triggerToast('Server cache purged successfully.')} className="dark-btn text-amber-500">
                    Purge Cache
                  </button>
                </div>

                <div className="flex justify-between items-center p-4 border border-neutral-900 rounded-lg">
                  <div>
                    <h4 className="font-bold text-white text-sm">Purge Error Logs</h4>
                    <p className="text-xs text-gray-400">Wipe historical server-side crash reports. Cannot be undone.</p>
                  </div>
                  <button onClick={() => triggerToast('Logs cleaned.')} className="dark-btn text-red-500">
                    Purge Logs
                  </button>
                </div>

              </div>
            </div>
          )}

          {/* TAB 7: BACKUPS */}
          {selectedTab === 'backups' && (
            <div className="space-y-8 animate-fade-in">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-3xl font-extrabold text-white">Database Backup & Recovery</h1>
                  <p className="text-sm text-gray-500">Export platform state configurations, menu items, or tables to standard JSON files.</p>
                </div>
                <button 
                  onClick={() => triggerToast('Database backup archive created.')} 
                  className="gold-glow-btn"
                >
                  <Database className="w-4 h-4" />
                  Backup Now
                </button>
              </div>

              <div className="glass-card p-6">
                <h3 className="text-lg font-bold text-white mb-4">Historical Archives</h3>
                
                <div className="space-y-3">
                  {[
                    { date: '2026-06-27 12:00', size: '1.4 MB', name: 'serveqr_backup_auto_daily.sql' },
                    { date: '2026-06-26 12:00', size: '1.4 MB', name: 'serveqr_backup_auto_daily.sql' },
                    { date: '2026-06-25 12:00', size: '1.3 MB', name: 'serveqr_backup_auto_daily.sql' }
                  ].map((bak, i) => (
                    <div key={i} className="flex justify-between items-center p-4 border border-neutral-900 rounded-lg bg-neutral-950/20">
                      <div className="flex items-center gap-4">
                        <Database className="w-4 h-4 text-[#D4AF37]" />
                        <div>
                          <span className="font-bold text-white text-sm">{bak.name}</span>
                          <span className="text-xs text-gray-500 ml-3">({bak.size})</span>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 flex items-center gap-4">
                        <span>{bak.date}</span>
                        <button 
                          onClick={() => triggerToast(`Restoring backup archive ${bak.name}...`)} 
                          className="dark-btn text-xs py-1.5 px-3"
                        >
                          Restore
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: SETTINGS */}
          {selectedTab === 'settings' && (
            <div className="space-y-8 animate-fade-in max-w-2xl mx-auto">
              <div>
                <h1 className="text-3xl font-extrabold text-white">Platform Settings</h1>
                <p className="text-sm text-gray-500">Configure global admin variables, API credentials, and developer notifications.</p>
              </div>

              <div className="glass-card p-8 space-y-6">
                
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-400 block">Owner API Key</label>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value="••••••••••••••••••••••••••••••••••••••••"
                      disabled
                      className="flex-1 glass-input"
                    />
                    <button onClick={() => triggerToast('API key copied to clipboard.')} className="dark-btn">
                      Copy
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-400 block">Downtime Alerts Email</label>
                  <input
                    type="email"
                    value="devops@serveqr.com"
                    className="w-full glass-input"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-400 block">Platform Theme Color</label>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#D4AF37]"></div>
                    <span className="text-sm text-white font-medium">Gold Accent (#D4AF37)</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-neutral-900 flex justify-end">
                  <button onClick={() => triggerToast('Admin settings saved successfully.')} className="gold-glow-btn">
                    Save Changes
                  </button>
                </div>

              </div>
            </div>
          )}

        </main>
      </div>

      {/* --- ADD RESTAURANT MODAL --- */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card bg-neutral-950 border-[#D4AF37]/40 w-full max-w-lg p-6 space-y-6 animate-fade-in">
            <div className="flex justify-between items-center border-b border-neutral-900 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-[#D4AF37]" />
                Add Restaurant
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddRestaurant} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs text-gray-400">Restaurant Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Royal Spice"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full glass-input"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-400">Owner Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Adnan Karim"
                  value={newOwner}
                  onChange={(e) => setNewOwner(e.target.value)}
                  className="w-full glass-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-gray-400">Phone</label>
                  <input
                    type="text"
                    placeholder="e.g. +91 99000 88000"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full glass-input"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-400">Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full glass-input"
                  >
                    <option value="Active">Active</option>
                    <option value="Trial">Trial</option>
                    <option value="Pending Setup">Pending Setup</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-neutral-900 flex justify-end gap-3">
                <button type="button" onClick={() => setShowAddModal(false)} className="dark-btn">
                  Cancel
                </button>
                <button type="submit" className="gold-glow-btn">
                  Add Restaurant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT RESTAURANT MODAL --- */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card bg-neutral-950 border-[#D4AF37]/40 w-full max-w-lg p-6 space-y-6 animate-fade-in">
            <div className="flex justify-between items-center border-b border-neutral-900 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-[#D4AF37]" />
                Edit Restaurant
              </h3>
              <button onClick={() => setShowEditModal(false)} className="text-gray-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs text-gray-400">Restaurant Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Royal Spice"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full glass-input"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-400">Owner Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Adnan Karim"
                  value={editOwner}
                  onChange={(e) => setEditOwner(e.target.value)}
                  className="w-full glass-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-gray-400">Phone</label>
                  <input
                    type="text"
                    placeholder="e.g. +91 99000 88000"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full glass-input"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-400">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full glass-input"
                  >
                    <option value="Active">Active</option>
                    <option value="Trial">Trial</option>
                    <option value="Pending Setup">Pending Setup</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-neutral-900 flex justify-end gap-3">
                <button type="button" onClick={() => setShowEditModal(false)} className="dark-btn">
                  Cancel
                </button>
                <button type="submit" className="gold-glow-btn">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- DELETE CONFIRMATION MODAL --- */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card bg-neutral-950 border-red-500/40 w-full max-w-md p-6 space-y-6 animate-fade-in">
            <div className="flex items-center gap-3 text-red-500">
              <AlertCircle className="w-6 h-6" />
              <h3 className="text-lg font-bold text-white">Delete Tenant?</h3>
            </div>
            
            <p className="text-sm text-gray-400">
              Are you sure you want to permanently delete **{activeRestaurant?.name}**? All menu configurations, tables list, and billing history will be deleted.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowDeleteModal(false)} className="dark-btn">
                Cancel
              </button>
              <button onClick={handleDeleteConfirm} className="dark-btn text-white bg-red-600 hover:bg-red-700 hover:border-red-600 border-none">
                Delete Tenant
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- DEPLOY SERVICE MODAL --- */}
      {showDeployModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card bg-neutral-950 border-[#D4AF37]/40 w-full max-w-md p-6 space-y-6 animate-fade-in">
            <div className="flex justify-between items-center border-b border-neutral-900 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Play className="w-5 h-5 text-[#D4AF37]" />
                Trigger Deploy
              </h3>
              <button onClick={() => setShowDeployModal(false)} className="text-gray-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTriggerDeploy} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs text-gray-400">Select Service App</label>
                <select
                  value={deployApp}
                  onChange={(e) => setDeployApp(e.target.value)}
                  className="w-full glass-input"
                >
                  <option value="Customer App">Customer App (Frontend)</option>
                  <option value="Staff Dashboard">Staff Dashboard</option>
                  <option value="Kitchen App">Kitchen App</option>
                  <option value="API Server">API Server (Backend)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-400">Git Target Branch</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. main"
                  value={deployBranch}
                  onChange={(e) => setDeployBranch(e.target.value)}
                  className="w-full glass-input"
                />
              </div>

              <div className="pt-4 border-t border-neutral-900 flex justify-end gap-3">
                <button type="button" onClick={() => setShowDeployModal(false)} className="dark-btn">
                  Cancel
                </button>
                <button type="submit" className="gold-glow-btn">
                  Deploy Branch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- BULK QR CODE BATCH GENERATOR MODAL --- */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card bg-neutral-950 border-[#D4AF37]/40 w-full max-w-lg p-6 space-y-6 animate-fade-in">
            <div className="flex justify-between items-center border-b border-neutral-900 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <QrCode className="w-5 h-5 text-[#D4AF37]" />
                Generate Table QRs for {activeRestaurant?.name}
              </h3>
              <button onClick={() => setShowQrModal(false)} className="text-gray-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGenerateQrs} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs text-gray-400">Number of Tables to Map</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={qrCount}
                  onChange={(e) => setQrCount(parseInt(e.target.value))}
                  className="w-full glass-input"
                />
              </div>

              {generatedQrs && (
                <div className="border border-neutral-900 rounded-lg p-4 bg-neutral-950/60 text-xs space-y-2">
                  <span className="font-semibold text-emerald-500">Batch Code Info:</span>
                  <div className="max-h-24 overflow-y-auto pr-2 space-y-1">
                    {generatedQrs.map(qr => (
                      <div key={qr.table} className="flex justify-between text-gray-400">
                        <span>Table {qr.table}:</span>
                        <span className="text-white">{qr.code}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-neutral-900 flex justify-end gap-3">
                <button type="button" onClick={() => { setShowQrModal(false); setGeneratedQrs(null); }} className="dark-btn">
                  Close
                </button>
                <button type="submit" className="gold-glow-btn">
                  Generate QRs
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
