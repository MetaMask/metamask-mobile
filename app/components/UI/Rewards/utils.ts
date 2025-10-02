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
import { getAddressAccountType } from '../../../util/address';

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
export enum RewardsMetricsButtons {
  WAYS_TO_EARN = 'ways_to_earn',
  COPY_REFERRAL_CODE = 'copy_referral_code',
  COPY_REFERRAL_LINK = 'copy_referral_link',
  SHARE_REFERRAL_LINK = 'share_referral_link',
  OPT_OUT = 'opt_out',
  OPT_OUT_CANCEL = 'opt_out_cancel',
}

export const deriveAccountMetricProps = (account?: InternalAccount) => {
  if (!account) {
    return {
      scope: undefined,
      account_type: undefined,
    };
  }

  const scope = isEvmAccountType(account.type)
    ? 'evm'
    : isSolanaAccount(account)
    ? 'solana'
    : account.type; // Fallback to account.type for other types
  let type = account.metadata?.keyring?.type;

  try {
    type = getAddressAccountType(account.address);
  } catch (error) {
    // If app goes to idle state, `getAddressAccountType` throws an error because app is locked
    // To prevent that, we catch the error and let type be the one from metadata
  }

  return {
    scope,
    account_type: type,
  };
};
