/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {Object} coord1 - First coordinate {latitude, longitude}
 * @param {Object} coord2 - Second coordinate {latitude, longitude}
 * @returns {Number} Distance in meters
 */
function haversineDistance(coord1, coord2) {
  const toRad = (value) => (value * Math.PI) / 180;
  
  const lat1 = coord1.latitude || coord1[1];
  const lon1 = coord1.longitude || coord1[0];
  const lat2 = coord2.latitude || coord2[1];
  const lon2 = coord2.longitude || coord2[0];
  
  const R = 6371e3; // Earth radius in meters
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lon2 - lon1);

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c; // Distance in meters
}

module.exports = {
  haversineDistance
};
