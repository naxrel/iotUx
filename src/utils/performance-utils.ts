/**
 * Performance utility functions for optimization
 */

/**
 * Hash data for change detection
 * Used to determine if data has actually changed before updating state
 * @param data - Any data to hash
 * @returns String hash of the data
 */
export const hashData = (data: any): string => {
  try {
    return JSON.stringify(data);
  } catch {
    return String(data);
  }
};
