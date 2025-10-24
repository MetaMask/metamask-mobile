/**
 * Validates a password against security requirements
 * @param password - The password string to validate
 * @returns True if password is valid, false otherwise
 */
export const validatePassword = (password: string): boolean => {
  const errors: string[] = [];

  // Check minimum length (15 characters)
  if (password.length < 15) {
    errors.push('Password must be at least 15 characters long');
  }

  // Check for non-printable characters (ASCII control characters and DEL)
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001F\u007F]/.test(password)) {
    errors.push('Password must not contain non-printable characters');
  }

  // Check for consecutive spaces
  if (/ {2}/.test(password)) {
    errors.push('Password must not contain consecutive spaces');
  }

  return errors.length === 0;
};
