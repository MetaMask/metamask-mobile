import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

// Initialize dayjs with relativeTime plugin
dayjs.extend(relativeTime);

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

  if (
    message.includes('not available') ||
    message.includes('Network request failed')
  ) {
    return 'Service is not available at the moment. Please try again shortly.';
  }
  return message;
};
