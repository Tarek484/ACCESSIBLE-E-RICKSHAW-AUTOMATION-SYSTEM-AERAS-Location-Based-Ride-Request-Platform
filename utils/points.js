/**
 * Calculate points for a completed ride
 * Formula: BasePoints = 10; DistancePoints = distanceMeters/10; FinalPoints = BasePoints + DistancePoints
 * @param {Number} distanceMeters - Distance traveled in meters
 * @returns {Number} Total points earned
 */
function calculatePoints(distanceMeters) {
  const BASE_POINTS = 10;
  const distancePoints = distanceMeters / 10;
  const finalPoints = BASE_POINTS + distancePoints;
  
  return Math.round(finalPoints * 100) / 100; // Round to 2 decimal places
}

module.exports = {
  calculatePoints
};
