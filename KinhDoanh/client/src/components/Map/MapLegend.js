/**
 * Map Legend Component
 * Hiển thị chú thích màu sắc zones
 */

import React from 'react';

const LEGEND_ITEMS = [
  { status: 'rented', color: '#28a745', label: 'Đã cho thuê', icon: '■' },
  { status: 'available', color: '#dc3545', label: 'Còn trống', icon: '■' },
  { status: 'deposited', color: '#fd7e14', label: 'Đã nhận cọc', icon: '■' },
  { status: 'fixed_service', color: '#ffffff', label: 'Dịch vụ cố định', icon: '□', textColor: '#000' }
];

function MapLegend({ stats }) {
  return (
    <div className="map-legend">
      <div className="legend-header">
        <strong>Chú thích</strong>
      </div>
      <div className="legend-items">
        {LEGEND_ITEMS.map((item) => (
          <div key={item.status} className="legend-item">
            <span 
              className="legend-color"
              style={{ 
                color: item.color,
                textShadow: item.status === 'fixed_service' ? '0 0 2px #000' : 'none'
              }}
            >
              {item.icon}
            </span>
            <span className="legend-label">{item.label}</span>
            {stats && (
              <span className="legend-count">
                ({stats[item.status] || 0})
              </span>
            )}
          </div>
        ))}
      </div>
      
      <div className="legend-footer">
        <small className="text-muted">
          <i className="bi bi-info-circle"></i> Click vào zone để xem chi tiết
        </small>
      </div>
    </div>
  );
}

export default MapLegend;
