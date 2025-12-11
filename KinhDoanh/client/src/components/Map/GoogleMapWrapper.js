/**
 * Google Map Wrapper Component
 * Wrapper cho Google Maps với các settings cơ bản
 */

import React from 'react';
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api';

const mapContainerStyle = {
  width: '100%',
  height: '600px'
};

const defaultCenter = {
  lat: 10.762622, // Hồ Chí Minh
  lng: 106.660172
};

const mapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: true,
  fullscreenControl: true,
  clickableIcons: false,
  mapTypeId: 'satellite', // satellite view for warehouses
  tilt: 0
};

function GoogleMapWrapper({ center, zoom = 16, children, onMapLoad }) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '',
    libraries: ['drawing', 'geometry']
  });

  const [, setMap] = React.useState(null); // map variable unused but setMap needed

  const onLoad = React.useCallback((mapInstance) => {
    setMap(mapInstance);
    if (onMapLoad) {
      onMapLoad(mapInstance);
    }
  }, [onMapLoad]);

  const onUnmount = React.useCallback(() => {
    setMap(null);
  }, []);

  if (loadError) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: 'red' }}>
        <h4>❌ Lỗi tải Google Maps</h4>
        <p>{loadError.message}</p>
        <p>Vui lòng kiểm tra:</p>
        <ul style={{ textAlign: 'left', display: 'inline-block' }}>
          <li>REACT_APP_GOOGLE_MAPS_API_KEY trong file .env</li>
          <li>API key đã được enable Maps JavaScript API</li>
          <li>Billing đã được setup (nếu cần)</li>
        </ul>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Đang tải bản đồ...</span>
        </div>
        <p className="mt-2">Đang tải Google Maps...</p>
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={center || defaultCenter}
      zoom={zoom}
      onLoad={onLoad}
      onUnmount={onUnmount}
      options={mapOptions}
    >
      {children}
    </GoogleMap>
  );
}

export default GoogleMapWrapper;
