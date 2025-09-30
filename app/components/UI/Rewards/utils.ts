import {
  CaipAccountId,
  parseCaipChainId,
  toCaipAccountId,
} from '@metamask/utils';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { InternalAccount } from '@metamask/keyring-internal-api';
import Logger from '../../../util/Logger';
import { isEvmAccountType } from '@metamask/keyring-api';
import { isSolanaAccount } from '../../../core/Multichain/utils';

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

  if (message.includes('Failed to claim reward')) {
    return 'Failed to claim reward. Please try again shortly.';
  }

  if (
    message.includes('not available') ||
    message.includes('Network request failed')
  ) {
    return 'Service is not available at the moment. Please try again shortly.';
  }
  return message;
};

export const convertInternalAccountToCaipAccountId = (
  account: InternalAccount,
): CaipAccountId | null => {
  try {
    const [scope] = account.scopes;
    const { namespace, reference } = parseCaipChainId(scope);
    return toCaipAccountId(namespace, reference, account.address);
  } catch (error) {
    Logger.log(
      'RewardsUtils: Failed to convert address to CAIP-10 format:',
      error,
    );
    return null;
  }
};

// Metrics related utils
export enum RewardsMetricsStatuses {
  STARTED = 'started',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELED = 'canceled',
}

export const formatAccountScope = (account: InternalAccount): string =>
  isEvmAccountType(account.type)
    ? 'evm'
    : isSolanaAccount(account)
    ? 'solana'
    : account.type; // Fallback to account.type for other types
