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
