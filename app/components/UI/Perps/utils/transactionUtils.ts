/**
 * Get the timestamp for 14 days ago from now
 * Used for userFundingsListTimePeriod to fetch funding data from the last 14 days
 * @returns Unix timestamp in milliseconds for 14 days ago
 */
export const getUserFundingsListTimePeriod = (): number => {
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
  return sevenDaysAgo;
};
