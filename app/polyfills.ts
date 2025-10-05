//// Import dynamic polyfills
//import './dynamic-polyfills';
//
//// This file is kept minimal to reduce the initial bundle size
//// The actual polyfills are loaded dynamically only when needed
//// See dynamic-polyfills.ts for the implementation
//
//// Add basic feature detection for older browsers
//if (typeof window !== 'undefined') {
//  // This will run only on the client side
//  window.addEventListener('DOMContentLoaded', () => {
//    // Check for essential modern browser features
//    const missingFeatures = [];
//
//    if (!window.Promise) missingFeatures.push('Promise');
//    if (!window.fetch) missingFeatures.push('fetch');
//    if (!window.IntersectionObserver) missingFeatures.push('IntersectionObserver');
//    if (!window.requestAnimationFrame) missingFeatures.push('requestAnimationFrame');
//
//    // Log missing features for debugging
//    if (missingFeatures.length > 0) {
//      console.warn(`This app may not work well on this device. Missing features: ${missingFeatures.join(', ')}`);
//    }
//  });
//}
