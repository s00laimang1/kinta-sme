/**
 * This utility helps with code splitting and lazy loading
 * to improve performance on older devices
 */

/**
 * Dynamically imports a component only when needed
 * @param importFn - The import function that returns a Promise
 * @returns A component that will be loaded dynamically
 */
export function dynamicImport<T>(importFn: () => Promise<{ default: T }>) {
  return async () => {
    try {
      const module = await importFn();
      return module.default;
    } catch (error) {
      console.error('Error dynamically importing component:', error);
      throw error;
    }
  };
}

/**
 * Loads a script dynamically
 * @param src - The source URL of the script
 * @param async - Whether to load the script asynchronously
 * @param defer - Whether to defer loading the script
 * @returns A Promise that resolves when the script is loaded
 */
export function loadScript(src: string, async = true, defer = true): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      resolve();
      return;
    }

    // Check if script is already loaded
    const existingScript = document.querySelector(`script[src="${src}"]`);
    if (existingScript) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = async;
    script.defer = defer;

    script.onload = () => resolve();
    script.onerror = (error) => reject(error);

    document.head.appendChild(script);
  });
}

///**
// * Loads a stylesheet dynamically
// * @param href - The href URL of the stylesheet
// * @returns A Promise that resolves when the stylesheet is loaded
// */
//export function loadStylesheet(href: string): Promise<void> {
//  return new Promise((resolve, reject) => {
//    if (typeof window === 'undefined') {
//      resolve();
//      return;
//    }
//
//    // Check if stylesheet is already loaded
//    const existingLink = document.querySelector(`link[href="${href}"]`);
//    if (existingLink) {
//      resolve();
//      return;
//    }
//
//    const link = document.createElement('link');
//    link.rel = 'stylesheet';
//    link.href = href;
//
//    link.onload = () => resolve();
//    link.onerror = (error) => reject(error);
//
//    document.head.appendChild(link);
//  });
//}

/**
 * Detects if the current device is low-end based on memory and CPU
 * @returns True if the device is low-end, false otherwise
 */
export function isLowEndDevice(): boolean {
  if (typeof window === 'undefined') return false;

  // Check for device memory API
  const lowMemory = (
    // @ts-ignore - deviceMemory is not in the standard TypeScript DOM types
    'deviceMemory' in navigator && navigator.deviceMemory < 2
  );

  // Check for hardware concurrency (CPU cores)
  const lowCPU = (
    'hardwareConcurrency' in navigator && navigator.hardwareConcurrency < 4
  );

  // Check for connection type
  const slowConnection = (
    // @ts-ignore - connection is not in the standard TypeScript DOM types
    'connection' in navigator && 
    // @ts-ignore
    (navigator.connection.saveData === true || 
    // @ts-ignore
    navigator.connection.effectiveType === 'slow-2g' || 
    // @ts-ignore
    navigator.connection.effectiveType === '2g')
  );

  return lowMemory || lowCPU || slowConnection;
}