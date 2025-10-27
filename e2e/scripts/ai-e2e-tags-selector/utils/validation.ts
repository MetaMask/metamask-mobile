/**
 * Input Validation Utilities
 *
 * Validates and sanitizes user inputs to prevent injection attacks
 */

/**
 * Validates and sanitizes a PR number to prevent command injection
 * @param input - The input to validate (can be string or number)
 * @returns Safe PR number or null if invalid
 */
export function validatePRNumber(input: unknown): number | null {
  // Convert to number if string
  const num = typeof input === 'string' ? parseInt(input, 10) : input;

  // Check if it's a valid positive integer
  if (typeof num !== 'number' || !Number.isInteger(num) || num <= 0 || num > 999999) {
    return null;
  }

  return num;
}

/**
 * Validates a file path to ensure it's safe
 */
export function validateFilePath(path: string): boolean {
  if (!path || typeof path !== 'string') {
    return false;
  }

  // Check for path traversal attempts
  if (path.includes('..') || path.startsWith('/')) {
    return false;
  }

  return true;
}

/**
 * Validates a branch name
 */
export function validateBranchName(branch: string): boolean {
  if (!branch || typeof branch !== 'string') {
    return false;
  }

  // Basic validation - branch names should be alphanumeric with some special chars
  const branchRegex = /^[a-zA-Z0-9/_.-]+$/;
  return branchRegex.test(branch);
}
