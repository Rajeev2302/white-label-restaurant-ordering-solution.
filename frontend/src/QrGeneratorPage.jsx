import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import JSZip from 'jszip';
import { jsPDF } from 'jspdf';
import { Download, QrCode, ArrowLeft, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function QrGeneratorPage({ settings, setCurrentPath }) {
  const [baseUrl, setBaseUrl] = useState(() => {
    // Default to the current host origin (e.g. http://localhost:5173/)
    return window.location.origin + '/';
  });
  const [numTables, setNumTables] = useState(5);
  const [startTable, setStartTable] = useState(1);
  const [endTable, setEndTable] = useState(5);
  const [qrCodes, setQrCodes] = useState({}); // { [tableNum]: dataUrl }
  const [generating, setGenerating] = useState(false);
  const [actionStatus, setActionStatus] = useState({ success: false, message: '' });

  // Sync inputs: table count vs start/end
  const handleCountChange = (val) => {
    const count = Math.max(1, parseInt(val) || 1);
    setNumTables(count);
    setEndTable(startTable + count - 1);
  };

  const handleStartChange = (val) => {
    const start = Math.max(1, parseInt(val) || 1);
    setStartTable(start);
    setEndTable(start + numTables - 1);
  };

  const handleEndChange = (val) => {
    const end = Math.max(startTable, parseInt(val) || startTable);
    setEndTable(end);
    setNumTables(end - startTable + 1);
  };

  // Generate table number array
  const tableList = React.useMemo(() => {
    const list = [];
    for (let i = startTable; i <= endTable; i++) {
      list.push(i);
    }
    return list;
  }, [startTable, endTable]);

  // Generate QR data URLs dynamically when tables list or baseUrl changes
  useEffect(() => {
    let active = true;
    const generateAllQrs = async () => {
      setGenerating(true);
      const codes = {};
      try {
        for (const table of tableList) {
          const url = `${baseUrl}?table=${table}`;
          // Generate QR code data URL (black on white)
          const dataUrl = await QRCode.toDataURL(url, {
            margin: 1,
            width: 400,
            color: {
              dark: '#000000',
              light: '#ffffff'
            }
          });
          codes[table] = dataUrl;
        }
        if (active) {
          setQrCodes(codes);
        }
      } catch (err) {
        console.error('QR generation error:', err);
      } finally {
        if (active) {
          setGenerating(false);
        }
      }
    };

    generateAllQrs();
    return () => {
      active = false;
    };
  }, [tableList, baseUrl]);

  // Helper utility to load image inside Promise
  const loadImage = (src) => {
    return new Promise((resolve) => {
      if (!src) {
        resolve(null);
        return;
      }
      const img = new Image();
      img.crossOrigin = 'anonymous'; // Safe CORS handling
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null); // Return null on load error instead of crashing
      img.src = src;
    });
  };

  // Draw printable card to canvas
  const drawCardToCanvas = async (canvas, tableNumber, qrDataUrl) => {
    const ctx = canvas.getContext('2d');
    const accentColor = settings.themeColor || '#d4af37';

    // 1. Draw solid background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Draw border
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 10;
    ctx.strokeRect(25, 25, canvas.width - 50, canvas.height - 50);

    // Draw double inner border
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
    ctx.lineWidth = 1;
    ctx.strokeRect(35, 35, canvas.width - 70, canvas.height - 70);

    // 3. Load and Draw circular logo
    const logoImg = await loadImage(settings.logoUrl);
    if (logoImg) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(300, 110, 50, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(logoImg, 250, 60, 100, 100);
      ctx.restore();

      // Outer accent circle for logo
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(300, 110, 50, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      // Draw simple fork/knife logo placeholder
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(300, 110, 50, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = accentColor;
      ctx.font = '36px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🍽️', 300, 110);
    }

    // 4. Draw Restaurant Name
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#111827';
    ctx.font = 'bold 28px Outfit, Inter, sans-serif';
    ctx.fillText(settings.restaurantName || 'Restaurant Name', 300, 220);

    // Subtle divider
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(150, 240);
    ctx.lineTo(450, 240);
    ctx.stroke();

    // 5. Draw QR Code
    if (qrDataUrl) {
      const qrImg = await loadImage(qrDataUrl);
      if (qrImg) {
        ctx.drawImage(qrImg, 160, 265, 280, 280);
      }
    }

    // 6. Draw Table Number banner
    ctx.fillStyle = accentColor;
    ctx.fillRect(150, 570, 300, 65);

    ctx.fillStyle = '#000000';
    ctx.font = 'bold 36px Outfit, Inter, sans-serif';
    ctx.fillText(`TABLE ${tableNumber}`, 300, 617);

    // 7. Draw Scan to Order banner
    ctx.fillStyle = '#4b5563';
    ctx.font = '600 20px Inter, sans-serif';
    ctx.fillText('Scan to Order', 300, 685);

    ctx.fillStyle = '#9ca3af';
    ctx.font = '12px Inter, sans-serif';
    ctx.fillText('Order & Pay instantly from your table', 300, 715);
  };

  // Download single PNG card
  const downloadSinglePng = async (table) => {
    setActionStatus({ success: false, message: `Generating PNG for Table ${table}...` });
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 600;
      canvas.height = 800;
      await drawCardToCanvas(canvas, table, qrCodes[table]);

      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `table_${table}_qr_card.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setActionStatus({ success: true, message: `PNG for Table ${table} downloaded!` });
    } catch (err) {
      console.error(err);
      setActionStatus({ success: false, message: 'PNG generation failed.' });
    }
  };

  // Download all cards as ZIP
  const downloadAllZip = async () => {
    setActionStatus({ success: false, message: 'Bundling all QR codes into ZIP...' });
    try {
      const zip = new JSZip();
      for (const table of tableList) {
        const canvas = document.createElement('canvas');
        canvas.width = 600;
        canvas.height = 800;
        await drawCardToCanvas(canvas, table, qrCodes[table]);

        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        zip.file(`table_${table}_qr_card.png`, blob);
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      const safeName = (settings.restaurantName || 'restaurant').toLowerCase().replace(/\s+/g, '_');
      a.download = `${safeName}_table_qrs.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setActionStatus({ success: true, message: 'ZIP package downloaded successfully!' });
    } catch (err) {
      console.error(err);
      setActionStatus({ success: false, message: 'Failed to build ZIP archive.' });
    }
  };

  // Download Printable PDF
  const downloadPrintablePdf = async () => {
    setActionStatus({ success: false, message: 'Building PDF printable sheets...' });
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      for (let i = 0; i < tableList.length; i += 4) {
        if (i > 0) {
          pdf.addPage();
        }

        const chunk = tableList.slice(i, i + 4);
        for (let j = 0; j < chunk.length; j++) {
          const table = chunk[j];
          const canvas = document.createElement('canvas');
          canvas.width = 600;
          canvas.height = 800;
          await drawCardToCanvas(canvas, table, qrCodes[table]);
          const imgData = canvas.toDataURL('image/png');

          const col = j % 2;
          const row = Math.floor(j / 2);

          const cardW = 90;
          const cardH = 120;
          const startX = 15;
          const startY = 20;
          const gapX = 10;
          const gapY = 15;

          const x = startX + col * (cardW + gapX);
          const y = startY + row * (cardH + gapY);

          // Render image to PDF canvas
          pdf.addImage(imgData, 'PNG', x, y, cardW, cardH);

          // Add clean dashed scissors/cutting borders around cards
          pdf.setDrawColor(200, 200, 200);
          pdf.setLineDashPattern([2, 2], 0);
          pdf.rect(x, y, cardW, cardH);
        }
      }

      const safeName = (settings.restaurantName || 'restaurant').toLowerCase().replace(/\s+/g, '_');
      pdf.save(`${safeName}_qr_printables.pdf`);
      setActionStatus({ success: true, message: 'Printable PDF sheet downloaded!' });
    } catch (err) {
      console.error(err);
      setActionStatus({ success: false, message: 'PDF generation failed.' });
    }
  };

  return (
    <div className="setup-container">
      <div className="setup-card large-card">
        <div className="setup-header">
          <QrCode className="setup-logo-icon" size={28} />
          <div>
            <h2>QR Code Generator</h2>
            <p>Generate, preview, and download tables QR ordering cards</p>
          </div>
        </div>

        <div className="setup-tabs">
          <button 
            type="button" 
            className="setup-tab"
            onClick={() => {
              setCurrentPath('/setup');
              window.history.pushState({}, '', '/setup');
            }}
          >
            Settings Configurator
          </button>
          <button 
            type="button" 
            className="setup-tab active"
            disabled
          >
            QR Code Generator
          </button>
        </div>

        {/* Action Loader Banners */}
        {actionStatus.message && (
          <div className={`status-banner ${actionStatus.success ? 'success' : 'info-banner'}`}>
            {actionStatus.success ? <CheckCircle2 size={16} /> : <Loader2 className="spin" size={16} />}
            <span>{actionStatus.message}</span>
          </div>
        )}

        <div className="qr-generator-body">
          {/* Settings Section */}
          <div className="qr-settings-grid">
            <div className="form-group full-width">
              <label>Customer Menu Base URL (Domain)</label>
              <input 
                type="text" 
                value={baseUrl}
                onChange={e => setBaseUrl(e.target.value)}
                placeholder="https://your-domain.com/"
              />
              <span className="input-helper">Points to QR redirect query parameter <code>?table=N</code></span>
            </div>

            <div className="form-group">
              <label>Number of Tables</label>
              <input 
                type="number" 
                min="1"
                value={numTables}
                onChange={e => handleCountChange(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Starting Table Number</label>
              <input 
                type="number" 
                min="1"
                value={startTable}
                onChange={e => handleStartChange(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Ending Table Number (Calculated)</label>
              <input 
                type="number" 
                min={startTable}
                value={endTable}
                onChange={e => handleEndChange(e.target.value)}
              />
            </div>
          </div>

          {/* Download Action Bar */}
          <div className="qr-download-bar">
            <button 
              onClick={downloadAllZip} 
              disabled={generating || tableList.length === 0}
              className="action-btn-secondary"
            >
              <Download size={16} />
              <span>Download All as ZIP</span>
            </button>

            <button 
              onClick={downloadPrintablePdf} 
              disabled={generating || tableList.length === 0}
              className="action-btn-primary"
            >
              <Download size={16} />
              <span>Download Printable PDF (A4 Sheet)</span>
            </button>
          </div>

          {/* Live Preview Cards Grid */}
          <div className="qr-preview-section">
            <h3>Live Card Previews ({tableList.length} Tables)</h3>
            
            {generating ? (
              <div className="qr-spinner-box">
                <Loader2 className="spin" size={32} />
                <p>Generating high-resolution QR codes...</p>
              </div>
            ) : tableList.length === 0 ? (
              <div className="qr-empty-box">
                <AlertTriangle size={32} />
                <p>Please enter a valid range of tables to generate QR codes.</p>
              </div>
            ) : (
              <div className="qr-preview-grid">
                {tableList.map(table => (
                  <div key={table} className="qr-preview-card" style={{ borderColor: settings.themeColor || '#d4af37' }}>
                    {/* Header */}
                    <div className="card-header">
                      <img 
                        src={settings.logoUrl || "https://res.cloudinary.com/dwatx4zlt/image/upload/v1782051849/Logo_copy_imxucw.jpg"} 
                        alt="Logo"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                      <span className="card-brand">{settings.restaurantName || 'Restaurant'}</span>
                    </div>

                    {/* QR Image */}
                    <div className="card-qr-box">
                      {qrCodes[table] && <img src={qrCodes[table]} alt={`Table ${table} QR`} />}
                    </div>

                    {/* Table ID Label */}
                    <div className="card-table-tag" style={{ backgroundColor: settings.themeColor || '#d4af37' }}>
                      TABLE {table}
                    </div>

                    {/* Footer */}
                    <div className="card-footer-tag">Scan to Order</div>

                    <button 
                      onClick={() => downloadSinglePng(table)}
                      className="card-download-btn"
                      title="Download PNG card"
                    >
                      <Download size={14} /> Download PNG
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Back navigation */}
        <button 
          onClick={() => {
            setCurrentPath('/setup');
            window.history.pushState({}, '', '/setup');
          }} 
          className="back-to-menu-link-btn"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '20px' }}
        >
          <ArrowLeft size={16} /> Back to Setup Settings Panel
        </button>
      </div>
    </div>
  );
}
