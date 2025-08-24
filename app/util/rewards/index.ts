import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

// Initialize dayjs with relativeTime plugin
dayjs.extend(relativeTime);

/**
 * Formats a season end date to show time remaining until the season ends
 * @param date - The end date string (ISO format)
 * @returns Formatted string showing time remaining (e.g., "2 days", "3 hours") or status messages
 */
export const formatSeasonEndDate = (date: string | undefined): string => {
  if (!date) return 'Coming soon';

  try {
    const endDateTime = dayjs(date);
    const now = dayjs();

    if (endDateTime.isBefore(now)) return 'Season ended';

    // Use dayjs relative time formatting
    return `Season ends in ${endDateTime.from(now, true)}`;
  } catch {
    return 'Coming soon';
  }
};

export const REWARDS_ONBOARDING_COMPLETED_KEY = 'REWARDS_ONBOARDING_COMPLETED';

export const SOLANA_SIGNUP_NOT_SUPPORTED =
  'Signing in to Rewards with Solana accounts is not supported yet. Please use an Ethereum account instead.';

export const handleRewardsErrorMessage = (error: unknown) => {
  if (typeof error !== 'object' || error === null) {
    return 'Something went wrong. Please try again shortly.';
  }

  const errorObj = error as { data?: { message?: string }; message?: string };
  const message = errorObj?.data?.message ?? errorObj?.message;
  if (!message) {
    return 'Something went wrong. Please try again shortly.';
  }
  if (message.includes('already registered')) {
    return 'This account is already registered with another Rewards profile. Please switch account to continue.';
  }

  if (message.includes('rejected the request')) {
    return 'You rejected the request.';
  }

  if (message.includes('No keyring found')) {
    return SOLANA_SIGNUP_NOT_SUPPORTED;
  }
  return message;
};
