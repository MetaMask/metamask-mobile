import {
  CaipAccountId,
  parseCaipChainId,
  toCaipAccountId,
} from '@metamask/utils';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { InternalAccount } from '@metamask/keyring-internal-api';
import Logger from '../../../util/Logger';
import { strings } from '../../../../locales/i18n';
import { isEvmAccountType } from '@metamask/keyring-api';
import { isSolanaAccount } from '../../../core/Multichain/utils';
import { getAddressAccountType } from '../../../util/address';

// Initialize dayjs with relativeTime plugin
dayjs.extend(relativeTime);

export const SOLANA_SIGNUP_NOT_SUPPORTED = strings(
  'rewards.solana_signup_not_supported',
);

export const handleRewardsErrorMessage = (error: unknown) => {
  if (typeof error !== 'object' || error === null) {
    return strings('rewards.error_messages.something_went_wrong');
  }

  const errorObj = error as { data?: { message?: string }; message?: string };
  const message = errorObj?.data?.message ?? errorObj?.message;
  if (!message) {
    return strings('rewards.error_messages.something_went_wrong');
  }
  if (message.includes('already registered')) {
    return strings('rewards.error_messages.account_already_registered');
  }

  if (message.includes('rejected the request')) {
    return strings('rewards.error_messages.request_rejected');
  }

  if (message.includes('No keyring found')) {
    return SOLANA_SIGNUP_NOT_SUPPORTED;
  }

  if (message.includes('Failed to claim reward')) {
    return strings('rewards.error_messages.failed_to_claim_reward');
  }

  if (
    message.includes('not available') ||
    message.includes('Network request failed')
  ) {
    return strings('rewards.error_messages.service_not_available');
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
  VISIT_APP_STORE = 'visit_app_store',
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

// Referral URL builder
export const REFERRAL_LINK_PATH = 'link.metamask.io/rewards?referral=';
export const REFERRAL_BASE_URL = `https://${REFERRAL_LINK_PATH}`;

/**
 * Builds a referral URL from a referral code
 * @param referralCode - The referral code to build the URL from
 * @returns The full referral URL
 */
export const buildReferralUrl = (referralCode: string): string =>
  `${REFERRAL_BASE_URL}${referralCode}`;
