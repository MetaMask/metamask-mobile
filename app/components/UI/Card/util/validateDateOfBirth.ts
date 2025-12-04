/**
 * Validates if a given date of birth timestamp indicates the person is at least 18 years old
 * @param dateOfBirthTimestamp - The date of birth as a timestamp (in milliseconds)
 * @returns boolean - true if the person is 18 or older, false otherwise
 */
export const validateDateOfBirth = (dateOfBirthTimestamp: number): boolean => {
  // Check for invalid/missing timestamp (but allow negative timestamps for dates before 1970)
  if (
    dateOfBirthTimestamp === null ||
    dateOfBirthTimestamp === undefined ||
    isNaN(dateOfBirthTimestamp)
  ) {
    return false;
  }

  const dateOfBirth = new Date(dateOfBirthTimestamp);
  const today = new Date();

  // Check if the date is valid
  if (isNaN(dateOfBirth.getTime())) {
    return false;
  }

  // Check if the date is in the future
  if (dateOfBirth > today) {
    return false;
  }

  // Calculate age
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = today.getMonth() - dateOfBirth.getMonth();

  // Adjust age if birthday hasn't occurred this year yet
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())
  ) {
    age--;
  }

  return age >= 18;
};

// Utility function to format timestamp to YYYY-MM-DD
export const formatDateOfBirth = (timestamp: string): string => {
  if (!timestamp || timestamp.trim() === '') {
    return '';
  }
  const date = new Date(Number(timestamp));
  if (isNaN(date.getTime())) {
    return '';
  }
  return date.toISOString().split('T')[0]; // Returns YYYY-MM-DD format
};
