/**
 * Project Map View Component
 * Hiển thị dự án và các zones trên Google Map
 */

import React, { useState, useEffect } from 'react';
import { Marker } from '@react-google-maps/api';
import GoogleMapWrapper from './GoogleMapWrapper';
import WarehouseZone from './WarehouseZone';
import MapLegend from './MapLegend';
import './ProjectMapView.css';

function ProjectMapView({ project, zones, onZoneClick, showLegend = true }) {
  const [selectedZone, setSelectedZone] = useState(null);
  const [mapCenter, setMapCenter] = useState(null);
  const [filteredZones, setFilteredZones] = useState(zones || []);
  const [statusFilter, setStatusFilter] = useState('all');

  // Set map center từ project location
  useEffect(() => {
    if (project?.latitude && project?.longitude) {
      setMapCenter({
        lat: parseFloat(project.latitude),
        lng: parseFloat(project.longitude)
      });
    }
  }, [project]);

  // Filter zones theo status
  useEffect(() => {
    if (statusFilter === 'all') {
      setFilteredZones(zones || []);
    } else {
      setFilteredZones((zones || []).filter(z => z.status === statusFilter));
    }
  }, [zones, statusFilter]);

  const handleZoneClick = (zone) => {
    setSelectedZone(zone);
    if (onZoneClick) {
      onZoneClick(zone);
    }
  };

  // Statistics
  const stats = React.useMemo(() => {
    if (!zones || zones.length === 0) return null;
    
    const totalArea = zones.reduce((sum, z) => sum + (parseFloat(z.area) || 0), 0);
    const available = zones.filter(z => z.status === 'available');
    const rented = zones.filter(z => z.status === 'rented');
    const deposited = zones.filter(z => z.status === 'deposited');
    const fixedService = zones.filter(z => z.status === 'fixed_service');
    
    const availableArea = available.reduce((sum, z) => sum + (parseFloat(z.area) || 0), 0);
    const rentedArea = rented.reduce((sum, z) => sum + (parseFloat(z.area) || 0), 0);
    
    return {
      total: zones.length,
      totalArea,
      available: available.length,
      rented: rented.length,
      deposited: deposited.length,
      fixedService: fixedService.length,
      availableArea,
      rentedArea,
      occupancyRate: totalArea > 0 ? ((rentedArea / totalArea) * 100).toFixed(1) : 0
    };
  }, [zones]);

  if (!mapCenter) {
    return (
      <div className="alert alert-warning">
        <strong>⚠️ Chưa có tọa độ</strong>
        <p className="mb-0">Vui lòng cập nhật tọa độ (latitude, longitude) cho dự án để hiển thị bản đồ.</p>
      </div>
    );
  }

  return (
    <div className="project-map-view">
      {/* Map Header */}
      <div className="map-header mb-3">
        <div className="row align-items-center">
          <div className="col-md-6">
            <h5 className="mb-0">
              <i className="bi bi-map"></i> Bản đồ dự án
            </h5>
            {project?.address && (
              <small className="text-muted">📍 {project.address}</small>
            )}
          </div>
          
          <div className="col-md-6 text-end">
            {/* Filter */}
            <select 
              className="form-select form-select-sm d-inline-block w-auto"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Tất cả zones ({zones?.length || 0})</option>
              <option value="available">Còn trống ({stats?.available || 0})</option>
              <option value="rented">Đã thuê ({stats?.rented || 0})</option>
              <option value="deposited">Đã cọc ({stats?.deposited || 0})</option>
              <option value="fixed_service">Dịch vụ cố định ({stats?.fixedService || 0})</option>
            </select>
          </div>
        </div>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="map-stats mb-3">
          <div className="row g-2">
            <div className="col-md-3">
              <div className="stat-card">
                <div className="stat-label">Tổng zones</div>
                <div className="stat-value">{stats.total}</div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="stat-card">
                <div className="stat-label">Tổng diện tích</div>
                <div className="stat-value">{stats.totalArea.toLocaleString('vi-VN')} m²</div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="stat-card">
                <div className="stat-label">Đã cho thuê</div>
                <div className="stat-value text-success">{stats.rentedArea.toLocaleString('vi-VN')} m²</div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="stat-card">
                <div className="stat-label">Tỷ lệ lấp đầy</div>
                <div className="stat-value text-primary">{stats.occupancyRate}%</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Map Container */}
      <div className="map-container-wrapper">
        <GoogleMapWrapper
          center={mapCenter}
          zoom={project?.map_zoom || 18}
        >
          {/* Project Center Marker */}
          <Marker
            position={mapCenter}
            title={project?.name}
            icon={{
              url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
              scaledSize: window.google?.maps?.Size ? new window.google.maps.Size(40, 40) : undefined
            }}
          />

          {/* Warehouse Zones */}
          {filteredZones.map((zone) => (
            <WarehouseZone
              key={zone.id}
              zone={zone}
              onClick={handleZoneClick}
              isSelected={selectedZone?.id === zone.id}
            />
          ))}
        </GoogleMapWrapper>

        {/* Legend Overlay */}
        {showLegend && (
          <div className="map-legend-overlay">
            <MapLegend stats={stats} />
          </div>
        )}
      </div>

      {/* Selected Zone Info */}
      {selectedZone && (
        <div className="selected-zone-info mt-3">
          <div className="card">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <h6 className="card-title mb-1">
                    {selectedZone.zone_code}
                    {selectedZone.zone_name && ` - ${selectedZone.zone_name}`}
                  </h6>
                  <p className="text-muted mb-2">
                    <small>Zone ID: #{selectedZone.id}</small>
                  </p>
                </div>
                <button 
                  className="btn-close"
                  onClick={() => setSelectedZone(null)}
                  aria-label="Close"
                ></button>
              </div>
              
              <div className="row g-3">
                <div className="col-md-4">
                  <strong>Trạng thái:</strong>
                  <div>
                    <span className={`badge bg-${
                      selectedZone.status === 'rented' ? 'success' :
                      selectedZone.status === 'deposited' ? 'warning' :
                      selectedZone.status === 'available' ? 'danger' :
                      'secondary'
                    }`}>
                      {selectedZone.status === 'rented' ? 'Đã thuê' :
                       selectedZone.status === 'deposited' ? 'Đã cọc' :
                       selectedZone.status === 'available' ? 'Còn trống' :
                       'Dịch vụ cố định'}
                    </span>
                  </div>
                </div>
                
                <div className="col-md-4">
                  <strong>Diện tích:</strong>
                  <div>{selectedZone.area} m²</div>
                </div>
                
                {selectedZone.rental_price && (
                  <div className="col-md-4">
                    <strong>Giá thuê:</strong>
                    <div>{selectedZone.rental_price.toLocaleString('vi-VN')} VNĐ/m²</div>
                  </div>
                )}
              </div>
              
              {selectedZone.customer_info && (
                <div className="mt-3 pt-3 border-top">
                  <strong>Thông tin khách thuê:</strong>
                  <div className="mt-2">
                    <div><strong>Tên:</strong> {selectedZone.customer_info.name}</div>
                    {selectedZone.customer_info.phone && (
                      <div><strong>SĐT:</strong> {selectedZone.customer_info.phone}</div>
                    )}
                    {selectedZone.customer_info.email && (
                      <div><strong>Email:</strong> {selectedZone.customer_info.email}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProjectMapView;
