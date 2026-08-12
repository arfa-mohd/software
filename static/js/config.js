/**
 * AuraCare Nexus — Global Production & Hostinger / Render API Config
 */
const CONFIG = {
  // Production Render Backend Web Service API URL
  API_BASE_URL: (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? '' 
    : (window.RENDER_API_URL || 'https://software-1.onrender.com')
};

function getApiUrl(endpoint) {
  if (!endpoint) return CONFIG.API_BASE_URL;
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) return endpoint;
  const path = endpoint.startsWith('/') ? endpoint : '/' + endpoint;
  return CONFIG.API_BASE_URL + path;
}

// Global fetch override so EVERY fetch('/api/...') in the entire app automatically routes to Render API on Hostinger!
const _originalFetch = window.fetch;
window.fetch = function(resource, init) {
  if (typeof resource === 'string' && resource.startsWith('/api/')) {
    resource = getApiUrl(resource);
  } else if (resource instanceof Request && resource.url && resource.url.includes('/api/')) {
    const newUrl = getApiUrl(new URL(resource.url).pathname);
    resource = new Request(newUrl, resource);
  }
  return _originalFetch.call(this, resource, init);
};
