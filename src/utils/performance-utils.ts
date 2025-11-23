/**
 * Performance utility functions for optimization
 */

/**
 * Hash data for change detection
 * Used to determine if data has actually changed before updating state
 * Note: For complex objects, consider implementing a more sophisticated hashing
 * algorithm if performance becomes an issue. This simple implementation works
 * well for most use cases in this app.
 * @param data - Any data to hash
 * @returns String hash of the data
 */
export const hashData = (data: any): string => {
  try {
    // For primitives and null/undefined, return string representation
    if (data === null || data === undefined || typeof data !== 'object') {
      return String(data);
    }
    
    // For arrays, hash each element
    if (Array.isArray(data)) {
      return `[${data.map(hashData).join(',')}]`;
    }
    
    // For objects, sort keys and hash
    const sortedKeys = Object.keys(data).sort();
    const pairs = sortedKeys.map(key => `${key}:${hashData(data[key])}`);
    return `{${pairs.join(',')}}`;
  } catch (error) {
    // Fallback for circular references or other errors
    // Generate a more descriptive hash to avoid collisions
    const type = typeof data;
    const timestamp = Date.now();
    return `[hash-error:${type}:${timestamp}]`;
  }
};
