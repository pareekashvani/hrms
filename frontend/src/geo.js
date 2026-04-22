const _EARTH_RADIUS_M = 6_371_000

/** @returns {number} Great-circle distance in meters (WGS84 sphere approximation). */
export function haversineMeters(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180
  const φ1 = toRad(lat1)
  const φ2 = toRad(lat2)
  const dφ = toRad(lat2 - lat1)
  const dλ = toRad(lon2 - lon1)
  const a =
    Math.sin(dφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(dλ / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)))
  return _EARTH_RADIUS_M * c
}

/** Uses Asia/Kolkata (IST) to match server checkout rules. */
export function isAtOrAfterSevenPmIst() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date())
  const hour = Number(parts.find((p) => p.type === 'hour')?.value)
  return Number.isFinite(hour) && hour >= 19
}

/** @returns {Promise<GeolocationPosition>} */
export function getCurrentPositionAsync(options = {}) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('unsupported'))
      return
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 20000,
      ...options,
    })
  })
}
