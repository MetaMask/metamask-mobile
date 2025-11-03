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
 * Get the day of week in EST timezone
 * @param date - Date to check
 * @returns Day of week (0-6, where 0 is Sunday)
 */
const getESTDay = (date: Date): number => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
  });
  const dayName = formatter.format(date);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days.indexOf(dayName);
};

/**
 * Get the hours and minutes in EST timezone
 * @param date - Date to check
 * @returns Object with hours and minutes in EST
 */
const getESTTime = (
  date: Date,
): {
  hours: number;
  minutes: number;
  day: number;
  month: number;
  year: number;
} => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const parts = formatter.formatToParts(date);
  const values: Record<string, string> = {};
  parts.forEach((part) => {
    if (part.type !== 'literal') {
      values[part.type] = part.value;
    }
  });

  return {
    hours: parseInt(values.hour, 10),
    minutes: parseInt(values.minute, 10),
    day: parseInt(values.day, 10),
    month: parseInt(values.month, 10),
    year: parseInt(values.year, 10),
  };
};

/**
 * Check if a given date is a weekday (Monday-Friday) in EST timezone
 * @param date - Date to check
 * @returns true if weekday, false if weekend
 */
const isWeekday = (date: Date): boolean => {
  const day = getESTDay(date);
  return day >= 1 && day <= 5; // Monday = 1, Friday = 5
};

/**
 * Create a Date object for a specific EST time
 * @param year - Year
 * @param month - Month (1-12)
 * @param day - Day of month
 * @param hours - Hours (0-23)
 * @param minutes - Minutes
 * @returns Date object representing that EST time
 */
const createDateInEST = (
  year: number,
  month: number,
  day: number,
  hours: number,
  minutes: number,
): Date => {
  // Create an ISO string and explicitly specify it's in America/New_York timezone
  // by parsing it as if it were UTC, then adjusting for EST offset
  const monthStr = String(month).padStart(2, '0');
  const dayStr = String(day).padStart(2, '0');
  const hoursStr = String(hours).padStart(2, '0');
  const minutesStr = String(minutes).padStart(2, '0');

  // Create a date in UTC
  const utcDate = new Date(
    `${year}-${monthStr}-${dayStr}T${hoursStr}:${minutesStr}:00Z`,
  );

  // Get what time this UTC date would be in EST
  const estTime = getESTTime(utcDate);

  // Calculate the offset needed to make the EST time match our target
  const hourDiff = hours - estTime.hours;
  const minuteDiff = minutes - estTime.minutes;

  // Adjust the UTC date by the difference
  return new Date(
    utcDate.getTime() + hourDiff * 60 * 60 * 1000 + minuteDiff * 60 * 1000,
  );
};

/**
 * Get the next market open time from a given date
 * @param date - Current date
 * @returns Next market open date
 */
const getNextMarketOpen = (date: Date): Date => {
  const estDay = getESTDay(date);
  const estTime = getESTTime(date);

  // If weekend, move to next Monday
  if (estDay === 0) {
    // Sunday -> Monday (add 1 day)
    const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);
    const nextEstTime = getESTTime(nextDate);
    return createDateInEST(
      nextEstTime.year,
      nextEstTime.month,
      nextEstTime.day,
      9,
      30,
    );
  } else if (estDay === 6) {
    // Saturday -> Monday (add 2 days)
    const nextDate = new Date(date.getTime() + 2 * 24 * 60 * 60 * 1000);
    const nextEstTime = getESTTime(nextDate);
    return createDateInEST(
      nextEstTime.year,
      nextEstTime.month,
      nextEstTime.day,
      9,
      30,
    );
  }

  // Weekday - check if before 9:30 AM EST
  if (estTime.hours < 9 || (estTime.hours === 9 && estTime.minutes < 30)) {
    // Before market open today - open today at 9:30 AM EST
    return createDateInEST(estTime.year, estTime.month, estTime.day, 9, 30);
  }

  // After market hours - move to next day
  const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);
  const nextEstDay = getESTDay(nextDate);
  const nextEstTime = getESTTime(nextDate);

  // If next day is Saturday, move to Monday (add 2 more days)
  if (nextEstDay === 6) {
    const mondayDate = new Date(nextDate.getTime() + 2 * 24 * 60 * 60 * 1000);
    const mondayEstTime = getESTTime(mondayDate);
    return createDateInEST(
      mondayEstTime.year,
      mondayEstTime.month,
      mondayEstTime.day,
      9,
      30,
    );
  } else if (nextEstDay === 0) {
    // If next day is Sunday, move to Monday (add 1 more day)
    const mondayDate = new Date(nextDate.getTime() + 24 * 60 * 60 * 1000);
    const mondayEstTime = getESTTime(mondayDate);
    return createDateInEST(
      mondayEstTime.year,
      mondayEstTime.month,
      mondayEstTime.day,
      9,
      30,
    );
  }

  // Next day is a weekday
  return createDateInEST(
    nextEstTime.year,
    nextEstTime.month,
    nextEstTime.day,
    9,
    30,
  );
};

/**
 * Get the next market close time from a given date
 * Assumes market is currently open
 * @param date - Current date
 * @returns Next market close date (today at 4:00 PM EST)
 */
const getNextMarketClose = (date: Date): Date => {
  const estTime = getESTTime(date);
  return createDateInEST(estTime.year, estTime.month, estTime.day, 16, 0);
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
  const estTime = getESTTime(now);
  const { hours, minutes } = estTime;

  // Check if it's a weekday in EST
  if (!isWeekday(now)) {
    // Weekend - market is closed
    const nextOpen = getNextMarketOpen(now);
    const diffMs = nextOpen.getTime() - now.getTime();

    return {
      isOpen: false,
      nextTransition: nextOpen,
      countdownText: formatCountdown(diffMs),
    };
  }

  // Weekday - check if within market hours (9:30 AM - 4:00 PM EST)
  const currentTimeInMinutes = hours * 60 + minutes;
  const marketOpenInMinutes = 9 * 60 + 30; // 9:30 AM
  const marketCloseInMinutes = 16 * 60; // 4:00 PM

  if (
    currentTimeInMinutes >= marketOpenInMinutes &&
    currentTimeInMinutes < marketCloseInMinutes
  ) {
    // Market is open
    const nextClose = getNextMarketClose(now);
    const diffMs = nextClose.getTime() - now.getTime();

    return {
      isOpen: true,
      nextTransition: nextClose,
      countdownText: formatCountdown(diffMs),
    };
  }

  // Market is closed (before 9:30 AM or after 4:00 PM on weekday)
  const nextOpen = getNextMarketOpen(now);
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
