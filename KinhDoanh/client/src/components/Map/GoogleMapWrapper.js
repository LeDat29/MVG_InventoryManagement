/**
 * Google Map Wrapper Component
 * Wrapper cho Google Maps với các settings cơ bản
 */

import React from 'react';
import { GoogleMap, useJsApiLoader, MarkerF } from '@react-google-maps/api';

const GOOGLE_MAPS_LIBRARIES = ['drawing', 'geometry'];

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
  streetViewControl: true,
  mapTypeControl: true,
  fullscreenControl: true,
  clickableIcons: false,
  mapTypeId: 'satellite', // satellite view for warehouses
  tilt: 0
};

function GoogleMapWrapper({ center, zoom = 16, onMapLoad, onMapClick }) {
  const googleMapsApiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '';

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  React.useEffect(() => {
    if (!googleMapsApiKey) {
      console.warn("Google Maps API key is missing. Please add REACT_APP_GOOGLE_MAPS_API_KEY to your .env file.");
    }
  }, [googleMapsApiKey]);

  const [, setMap] = React.useState(null);
  const mapRef = React.useRef(null);

  const onLoad = React.useCallback((mapInstance) => {
    setMap(mapInstance);
    mapRef.current = mapInstance;
    if (onMapLoad) {
      onMapLoad(mapInstance);
    }
  }, [onMapLoad]);

  const onUnmount = React.useCallback(() => {
    setMap(null);
    mapRef.current = null;
  }, []);

  // Auto-center map when center prop changes
  React.useEffect(() => {
    if (mapRef.current && center) {
      mapRef.current.panTo(center);
      mapRef.current.setZoom(zoom);
    }
  }, [center, zoom]);

  const handleMapClick = React.useCallback((event) => {
    if (onMapClick) {
      onMapClick(event.latLng.lat(), event.latLng.lng());
    }
  }, [onMapClick]);

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

  if (!isLoaded && !loadError && !googleMapsApiKey) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: 'orange' }}>
        <h4>⚠️ API Key bị thiếu</h4>
        <p>Vui lòng cung cấp REACT_APP_GOOGLE_MAPS_API_KEY trong file .env để hiển thị bản đồ.</p>
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
      onClick={handleMapClick}
      options={mapOptions}
    >
      {/* 
        The user requested to replace GoogleMap with AdvancedMarkerElement.
        However, AdvancedMarkerElement is a marker, not a map container.
        The correct usage is to place a marker component *inside* the GoogleMap.
        Here, we use MarkerF (the functional component version of Marker) as an example.
      */}
      <MarkerF position={center || defaultCenter} />
    </GoogleMap>
  );
}

export default GoogleMapWrapper;
