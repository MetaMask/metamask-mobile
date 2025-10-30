/**
 * Market hours utilities for equity trading
 * Market hours: 9:30 AM - 4:00 PM EST, Monday-Friday
 */

export interface MarketHoursStatus {
  isOpen: boolean;
  nextTransition: Date;
  countdownText: string;
}

/**
 * Convert a date to EST timezone
 * @param date - Date to convert
 * @returns Date adjusted to EST
 */
const toEST = (date: Date): Date => {
  // Convert to EST (UTC-5) or EDT (UTC-4) depending on DST
  const estString = date.toLocaleString('en-US', {
    timeZone: 'America/New_York',
  });
  return new Date(estString);
};

/**
 * Check if a given date is a weekday (Monday-Friday)
 * @param date - Date to check
 * @returns true if weekday, false if weekend
 */
const isWeekday = (date: Date): boolean => {
  const day = date.getDay();
  return day >= 1 && day <= 5; // Monday = 1, Friday = 5
};

/**
 * Get the next market open time from a given date
 * @param date - Current date in EST
 * @returns Next market open date
 */
const getNextMarketOpen = (date: Date): Date => {
  const nextOpen = new Date(date);

  // If weekend, move to next Monday
  if (date.getDay() === 0) {
    // Sunday -> Monday
    nextOpen.setDate(date.getDate() + 1);
  } else if (date.getDay() === 6) {
    // Saturday -> Monday
    nextOpen.setDate(date.getDate() + 2);
  } else {
    // Weekday - check if before 9:30 AM
    const hours = date.getHours();
    const minutes = date.getMinutes();

    if (hours < 9 || (hours === 9 && minutes < 30)) {
      // Before market open today - open today at 9:30 AM
      nextOpen.setHours(9, 30, 0, 0);
      return nextOpen;
    }
    // After market hours - move to next day
    nextOpen.setDate(date.getDate() + 1);
  }

  // Set to 9:30 AM
  nextOpen.setHours(9, 30, 0, 0);

  // If we landed on weekend, move to Monday
  if (nextOpen.getDay() === 0) {
    nextOpen.setDate(nextOpen.getDate() + 1);
  } else if (nextOpen.getDay() === 6) {
    nextOpen.setDate(nextOpen.getDate() + 2);
  }

  return nextOpen;
};

/**
 * Get the next market close time from a given date
 * Assumes market is currently open
 * @param date - Current date in EST
 * @returns Next market close date (today at 4:00 PM)
 */
const getNextMarketClose = (date: Date): Date => {
  const nextClose = new Date(date);
  nextClose.setHours(16, 0, 0, 0);
  return nextClose;
};

/**
 * Format a time difference into a human-readable countdown string
 * @param diffMs - Time difference in milliseconds
 * @returns Formatted string like "8 hours, 10 minutes" or "45 minutes"
 */
export const formatCountdown = (diffMs: number): string => {
  const totalMinutes = Math.ceil(diffMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    const hourText = hours === 1 ? 'hour' : 'hours';
    const minuteText = minutes === 1 ? 'minute' : 'minutes';
    return `${hours} ${hourText}, ${minutes} ${minuteText}`;
  }

  const minuteText = minutes === 1 ? 'minute' : 'minutes';
  return `${minutes} ${minuteText}`;
};

/**
 * Check if markets are currently open and get next transition time
 * @param now - Optional current date (defaults to new Date())
 * @returns Market hours status with countdown
 */
export const getMarketHoursStatus = (
  now: Date = new Date(),
): MarketHoursStatus => {
  const estNow = toEST(now);
  const hours = estNow.getHours();
  const minutes = estNow.getMinutes();

  // Check if it's a weekday
  if (!isWeekday(estNow)) {
    // Weekend - market is closed
    const nextOpen = getNextMarketOpen(estNow);
    const diffMs = nextOpen.getTime() - now.getTime();

    return {
      isOpen: false,
      nextTransition: nextOpen,
      countdownText: formatCountdown(diffMs),
    };
  }

  // Weekday - check if within market hours (9:30 AM - 4:00 PM)
  const currentTimeInMinutes = hours * 60 + minutes;
  const marketOpenInMinutes = 9 * 60 + 30; // 9:30 AM
  const marketCloseInMinutes = 16 * 60; // 4:00 PM

  if (
    currentTimeInMinutes >= marketOpenInMinutes &&
    currentTimeInMinutes < marketCloseInMinutes
  ) {
    // Market is open
    const nextClose = getNextMarketClose(estNow);
    const diffMs = nextClose.getTime() - now.getTime();

    return {
      isOpen: true,
      nextTransition: nextClose,
      countdownText: formatCountdown(diffMs),
    };
  }

  // Market is closed (before 9:30 AM or after 4:00 PM on weekday)
  const nextOpen = getNextMarketOpen(estNow);
  const diffMs = nextOpen.getTime() - now.getTime();

  return {
    isOpen: false,
    nextTransition: nextOpen,
    countdownText: formatCountdown(diffMs),
  };
};

/**
 * Check if an asset is an equity that requires market hours display
 * @param marketType - The market type from PerpsMarketData
 * @returns true if the asset is an equity
 */
export const isEquityAsset = (marketType?: string): boolean =>
  marketType === 'equity';
