/**
 * Warehouse Zone Component
 * Vẽ zone trên Google Map với màu sắc theo trạng thái
 */

import React from 'react';
import { Polygon, InfoWindow } from '@react-google-maps/api';

// Màu sắc theo trạng thái
const STATUS_COLORS = {
  available: {
    fillColor: '#dc3545', // Đỏ - chưa cho thuê
    strokeColor: '#721c24',
    label: 'Còn trống'
  },
  rented: {
    fillColor: '#28a745', // Xanh - đã cho thuê
    strokeColor: '#155724',
    label: 'Đã thuê'
  },
  deposited: {
    fillColor: '#fd7e14', // Cam - đã cọc
    strokeColor: '#dc3545',
    label: 'Đã cọc'
  },
  fixed_service: {
    fillColor: '#ffffff', // Trắng - cố định
    strokeColor: '#6c757d',
    label: 'Dịch vụ cố định'
  },
  maintenance: {
    fillColor: '#ffc107', // Vàng - bảo trì
    strokeColor: '#856404',
    label: 'Bảo trì'
  }
};

function WarehouseZone({ zone, onClick, isSelected }) {
  const [showInfo, setShowInfo] = React.useState(false);
  const [infoPosition, setInfoPosition] = React.useState(null);

  // Parse coordinates từ JSON
  const paths = React.useMemo(() => {
    if (!zone.coordinates) return [];
    
    try {
      const coords = typeof zone.coordinates === 'string' 
        ? JSON.parse(zone.coordinates) 
        : zone.coordinates;
      
      // Chuyển đổi sang format Google Maps
      if (Array.isArray(coords)) {
        return coords.map(coord => ({
          lat: parseFloat(coord.lat || coord.latitude),
          lng: parseFloat(coord.lng || coord.longitude)
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Error parsing coordinates:', error);
      return [];
    }
  }, [zone.coordinates]);

  // Tính center của polygon để đặt InfoWindow
  const getCenter = React.useCallback(() => {
    if (paths.length === 0) return null;
    
    const lat = paths.reduce((sum, p) => sum + p.lat, 0) / paths.length;
    const lng = paths.reduce((sum, p) => sum + p.lng, 0) / paths.length;
    
    return { lat, lng };
  }, [paths]);

  // Get color theo status
  const colorConfig = STATUS_COLORS[zone.status] || STATUS_COLORS.available;

  // Polygon options
  const polygonOptions = {
    fillColor: colorConfig.fillColor,
    fillOpacity: isSelected ? 0.6 : 0.4,
    strokeColor: isSelected ? '#000000' : colorConfig.strokeColor,
    strokeOpacity: isSelected ? 1 : 0.8,
    strokeWeight: isSelected ? 3 : 2,
    clickable: true,
    draggable: false,
    editable: false,
    geodesic: false,
    zIndex: isSelected ? 100 : 1
  };

  const handleClick = () => {
    const center = getCenter();
    if (center) {
      setInfoPosition(center);
      setShowInfo(true);
    }
    if (onClick) {
      onClick(zone);
    }
  };

  const handleMouseOver = () => {
    if (!isSelected) {
      setShowInfo(true);
      const center = getCenter();
      if (center) {
        setInfoPosition(center);
      }
    }
  };

  const handleMouseOut = () => {
    if (!isSelected) {
      setShowInfo(false);
    }
  };

  if (paths.length === 0) {
    return null;
  }

  return (
    <>
      <Polygon
        paths={paths}
        options={polygonOptions}
        onClick={handleClick}
        onMouseOver={handleMouseOver}
        onMouseOut={handleMouseOut}
      />
      
      {showInfo && infoPosition && (
        <InfoWindow
          position={infoPosition}
          onCloseClick={() => setShowInfo(false)}
        >
          <div style={{ maxWidth: '250px' }}>
            <h6 className="mb-2">
              <strong>{zone.zone_code}</strong>
              {zone.zone_name && ` - ${zone.zone_name}`}
            </h6>
            
            <div className="mb-2">
              <span 
                className="badge" 
                style={{ 
                  backgroundColor: colorConfig.fillColor,
                  color: zone.status === 'fixed_service' ? '#000' : '#fff'
                }}
              >
                {colorConfig.label}
              </span>
            </div>
            
            <div style={{ fontSize: '13px' }}>
              <div><strong>Diện tích:</strong> {zone.area} m²</div>
              
              {zone.zone_type && (
                <div><strong>Loại:</strong> {
                  zone.zone_type === 'rental' ? 'Cho thuê' :
                  zone.zone_type === 'fixed_service' ? 'Dịch vụ cố định' :
                  'Khu vực chung'
                }</div>
              )}
              
              {zone.rental_price && zone.status !== 'fixed_service' && (
                <div><strong>Giá thuê:</strong> {zone.rental_price.toLocaleString('vi-VN')} VNĐ/m²</div>
              )}
              
              {zone.customer_info && zone.status === 'rented' && (
                <div className="mt-2 pt-2" style={{ borderTop: '1px solid #ddd' }}>
                  <strong>Khách thuê:</strong>
                  <div>{zone.customer_info.name}</div>
                  {zone.customer_info.phone && (
                    <div>📞 {zone.customer_info.phone}</div>
                  )}
                  {zone.customer_info.contract_end && (
                    <div>
                      <small>Hết hạn: {new Date(zone.customer_info.contract_end).toLocaleDateString('vi-VN')}</small>
                    </div>
                  )}
                </div>
              )}
              
              {zone.facilities && Object.keys(zone.facilities).length > 0 && (
                <div className="mt-2">
                  <strong>Tiện ích:</strong>
                  <div style={{ fontSize: '12px' }}>
                    {Object.entries(zone.facilities).map(([key, value]) => (
                      value && <span key={key} className="badge bg-secondary me-1">{key}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {onClick && (
              <button 
                className="btn btn-sm btn-primary mt-2 w-100"
                onClick={() => onClick(zone)}
              >
                Xem chi tiết
              </button>
            )}
          </div>
        </InfoWindow>
      )}
    </>
  );
}

export default WarehouseZone;
