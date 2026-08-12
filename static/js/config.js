/**
 * AuraCare Nexus — Global Production & Hostinger / Render API Config
 */
const CONFIG = {
  // Replace this URL with your actual deployed Render.com Backend URL
  // Example: 'https://auracare-api.onrender.com'
  API_BASE_URL: (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? '' 
    : (window.RENDER_API_URL || 'https://software-1.onrender.com')
};

function getApiUrl(endpoint) {
  const path = endpoint.startsWith('/') ? endpoint : '/' + endpoint;
  return CONFIG.API_BASE_URL + path;
}
