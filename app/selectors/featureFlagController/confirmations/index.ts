import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import { Hex, Json } from '@metamask/utils';
import { RootState } from '../../../reducers';
import { TransactionType } from '@metamask/transaction-controller';
import {
  getRelayFixedSpreadFromConfig,
  RelayFixedSpreadConfig,
} from '../../../components/Views/confirmations/utils/relayFixedSpread';

export const ATTEMPTS_MAX_DEFAULT = 2;
export const BUFFER_INITIAL_DEFAULT = 0.025;
export const BUFFER_STEP_DEFAULT = 0.025;
export const BUFFER_SUBSEQUENT_DEFAULT = 0.05;
export const PAY_FIAT_ENABLED_TRANSACTION_TYPES = [];
export const PAY_FIAT_MAX_DELAY_MINUTES_FOR_PAYMENT_METHODS = 10;
export const PAY_HARDWARE_ENABLED_DEFAULT = false;
export const PAY_ENABLE_DEPOSIT_WALLET_WITHDRAW_DEFAULT = false;
export const PAY_ENABLE_MONEY_ACCOUNT_TRANSACTIONS_DEFAULT: Record<
  string,
  boolean
> = {};
export const PAY_DEFAULT_PAY_SELECTED_SECTION_DEFAULT:
  | Record<string, string>
  | undefined = undefined;
export const PAY_DEPOSIT_LIMITS_DEFAULT: Record<string, number> = {};
export const PAY_PREFILLED_AMOUNT_DEFAULT: PrefilledAmountFlags = {
  default: { enabled: false },
  overrides: {},
};
export const SLIPPAGE_DEFAULT = 0.005;
export const STX_DISABLED_DEFAULT = false;

export interface PreferredToken {
  address: string;
  chainId: string;
  successRate: number;
}

export interface PreferredTokensConfig {
  default: PreferredToken[];
  overrides: Record<string, PreferredToken[]>;
}

export interface BlockedTokenEntry {
  address: string;
  chainId: string;
}

export interface BlockedTokensListConfig {
  chainIds: string[];
  tokens: BlockedTokenEntry[];
}

export interface BlockedTokensConfig {
  default: BlockedTokensListConfig;
  overrides: Record<string, BlockedTokensListConfig>;
}

export interface MetaMaskPayFlags {
  attemptsMax: number;
  bufferInitial: number;
  bufferStep: number;
  bufferSubsequent: number;
  slippage: number;
  stxDisabled: boolean;
}

export interface PrefilledAmountConfig {
  enabled: boolean;
}

export interface PrefilledAmountFlags {
  default: PrefilledAmountConfig;
  overrides: Record<string, PrefilledAmountConfig>;
}

export interface MetaMaskPayExtendedFlags {
  enableDepositWalletWithdraw: boolean;
  enableMoneyAccountTransactions: Record<string, boolean>;
  defaultPaySelectedSection?: Record<string, string>;
  prefilledAmount: PrefilledAmountFlags;
}

export interface MetaMaskPayTokensFlags {
  preferredTokens: PreferredTokensConfig;
  blockedTokens: BlockedTokensConfig;
  minimumRequiredTokenBalance: number;
}

export interface PayPostQuoteConfig {
  enabled?: boolean;
  tokens?: Record<Hex, Hex[]>;
}

export interface PayPostQuoteFlags {
  default: PayPostQuoteConfig;
  overrides?: Record<string, PayPostQuoteConfig>;
}

export interface MetaMaskPayFiatFlags {
  enabledTransactionTypes: TransactionType[];
  maxDelayMinutesForPaymentMethods: number;
}

export interface MetaMaskPayHardwareFlags {
  enabled: boolean;
}

export const selectMetaMaskPayFlags = createSelector(
  selectRemoteFeatureFlags,
  (featureFlags): MetaMaskPayFlags & MetaMaskPayExtendedFlags => {
    const metaMaskPayFlags = featureFlags?.confirmations_pay as
      | Record<string, Json>
      | undefined;

    const metaMaskPayExtendedFlags =
      featureFlags?.confirmations_pay_extended as
        | Record<string, Json>
        | undefined;

    const attemptsMax =
      (metaMaskPayFlags?.attemptsMax as number) ?? ATTEMPTS_MAX_DEFAULT;

    const bufferInitial =
      (metaMaskPayFlags?.bufferInitial as number) ?? BUFFER_INITIAL_DEFAULT;

    const bufferStep =
      (metaMaskPayFlags?.bufferStep as number) ?? BUFFER_STEP_DEFAULT;

    const bufferSubsequent =
      (metaMaskPayFlags?.bufferSubsequent as number) ??
      BUFFER_SUBSEQUENT_DEFAULT;

    const slippage = (metaMaskPayFlags?.slippage as number) ?? SLIPPAGE_DEFAULT;

    const stxDisabled =
      (metaMaskPayFlags?.stxDisabled as boolean) ?? STX_DISABLED_DEFAULT;

    const enableDepositWalletWithdraw =
      (metaMaskPayExtendedFlags?.enableDepositWalletWithdraw as boolean) ??
      PAY_ENABLE_DEPOSIT_WALLET_WITHDRAW_DEFAULT;

    const enableMoneyAccountTransactions =
      (metaMaskPayExtendedFlags?.enableMoneyAccountTransactions as Record<
        string,
        boolean
      >) ?? PAY_ENABLE_MONEY_ACCOUNT_TRANSACTIONS_DEFAULT;

    const defaultPaySelectedSection =
      (metaMaskPayExtendedFlags?.defaultPaySelectedSection as Record<
        string,
        string
      >) ?? PAY_DEFAULT_PAY_SELECTED_SECTION_DEFAULT;

    const rawPrefill = metaMaskPayExtendedFlags?.prefilledAmount as
      | {
          default?: PrefilledAmountConfig;
          overrides?: Record<string, PrefilledAmountConfig>;
        }
      | undefined;

    const prefilledAmount: PrefilledAmountFlags = {
      default: rawPrefill?.default ?? PAY_PREFILLED_AMOUNT_DEFAULT.default,
      overrides:
        rawPrefill?.overrides ?? PAY_PREFILLED_AMOUNT_DEFAULT.overrides,
    };

    return {
      attemptsMax,
      bufferInitial,
      bufferStep,
      bufferSubsequent,
      slippage,
      stxDisabled,
      enableDepositWalletWithdraw,
      enableMoneyAccountTransactions,
      defaultPaySelectedSection,
      prefilledAmount,
    };
  },
);

/**
 * Resolves the effective prefilledAmount config for a given transaction type.
 * Override entries take precedence over default.
 */
export function selectPrefilledAmountConfig(
  state: RootState,
  transactionType?: string,
): PrefilledAmountConfig {
  const flags = selectMetaMaskPayFlags(state);
  const { prefilledAmount } = flags;

  const override = transactionType
    ? prefilledAmount.overrides?.[transactionType]
    : undefined;

  if (override) {
    return {
      enabled: override.enabled ?? prefilledAmount.default.enabled,
    };
  }

  return prefilledAmount.default;
}

export function selectDepositLimits(state: RootState): Record<string, number> {
  const featureFlags = selectRemoteFeatureFlags(state);

  const metaMaskPayExtendedFlags = featureFlags?.confirmations_pay_extended as
    | Record<string, Json>
    | undefined;

  return (
    (metaMaskPayExtendedFlags?.depositLimit as Record<string, number>) ??
    PAY_DEPOSIT_LIMITS_DEFAULT
  );
}

export const selectMetaMaskPayTokensFlags = createSelector(
  selectRemoteFeatureFlags,
  (featureFlags): MetaMaskPayTokensFlags => {
    const payTokenFlags = (featureFlags as Record<string, Json>)
      ?.confirmations_pay_tokens as
      | Record<string, Json | PreferredTokensConfig>
      | undefined;

    const rawBlockedTokens = payTokenFlags?.blockedTokens as
      | BlockedTokensConfig
      | undefined;

    return {
      preferredTokens: {
        default:
          ((payTokenFlags?.preferredTokens as PreferredTokensConfig)
            ?.default as PreferredToken[]) ?? [],
        overrides:
          ((payTokenFlags?.preferredTokens as PreferredTokensConfig)
            ?.overrides as Record<string, PreferredToken[]>) ?? {},
      },
      blockedTokens: {
        default: {
          chainIds: rawBlockedTokens?.default?.chainIds ?? [],
          tokens: rawBlockedTokens?.default?.tokens ?? [],
        },
        overrides: rawBlockedTokens?.overrides ?? {},
      },
      minimumRequiredTokenBalance:
        (payTokenFlags?.minimumRequiredTokenBalance as number) ?? 0,
    };
  },
);

interface RawPayPostQuoteFlag {
  default?: PayPostQuoteConfig;
  overrides?: Record<string, PayPostQuoteConfig>;
}

const selectPayPostQuoteFlags = createSelector(
  selectRemoteFeatureFlags,
  (featureFlags): PayPostQuoteFlags => {
    const raw = featureFlags?.confirmations_pay_post_quote as
      | RawPayPostQuoteFlag
      | undefined;

    const defaultConfig: PayPostQuoteConfig = {
      enabled: raw?.default?.enabled ?? false,
      tokens: raw?.default?.tokens,
    };

    return {
      default: defaultConfig,
      overrides: raw?.overrides,
    };
  },
);

/**
 * Resolves the effective post-quote config for a given transaction type.
 * If the type has an override entry, unset properties fall back to default.
 */
export const selectPayQuoteConfig = createSelector(
  [
    selectPayPostQuoteFlags,
    (_state: RootState, transactionType?: string) => transactionType,
  ],
  (flags, transactionType): PayPostQuoteConfig => {
    const override = transactionType
      ? flags.overrides?.[transactionType]
      : undefined;

    if (!override) {
      return flags.default;
    }

    return {
      enabled: override.enabled ?? flags.default.enabled,
      tokens: override.tokens ?? flags.default.tokens,
    };
  },
);

export function getPreferredTokensForTransactionType(
  preferredTokens: PreferredTokensConfig,
  transactionType?: string,
): PreferredToken[] {
  if (transactionType && preferredTokens.overrides[transactionType]) {
    return preferredTokens.overrides[transactionType];
  }
  return preferredTokens.default;
}

/**
 * Selector to get the allow list for non-zero unused approvals from remote feature flags.
 *
 * @param state - The MetaMask state object
 * @returns {string[]} Array of URL strings for the allow list
 */
export const selectNonZeroUnusedApprovalsAllowList = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags: ReturnType<typeof selectRemoteFeatureFlags>) =>
    remoteFeatureFlags?.nonZeroUnusedApprovals ?? [],
);

export const selectMetaMaskPayFiatFlags = createSelector(
  selectRemoteFeatureFlags,
  (featureFlags): MetaMaskPayFiatFlags => {
    const raw = featureFlags?.confirmations_pay_fiat as
      | Record<string, Json>
      | undefined;

    return {
      enabledTransactionTypes:
        (raw?.enabledTransactionTypes as TransactionType[]) ??
        PAY_FIAT_ENABLED_TRANSACTION_TYPES,
      maxDelayMinutesForPaymentMethods:
        (raw?.maxDelayMinutesForPaymentMethods as number) ??
        PAY_FIAT_MAX_DELAY_MINUTES_FOR_PAYMENT_METHODS,
    };
  },
);

export const selectMetaMaskPayHardwareFlags = createSelector(
  selectRemoteFeatureFlags,
  (featureFlags): MetaMaskPayHardwareFlags => {
    const raw = featureFlags?.confirmations_pay_hardware as
      | Record<string, Json>
      | undefined;

    return {
      enabled: (raw?.enabled as boolean) ?? PAY_HARDWARE_ENABLED_DEFAULT,
    };
  },
);

export const selectRelayFixedSpread = createSelector(
  selectRemoteFeatureFlags,
  (featureFlags): RelayFixedSpreadConfig =>
    getRelayFixedSpreadFromConfig(
      featureFlags?.confirmations_relay_fixed_spread,
      'confirmations_relay_fixed_spread',
    ),
);
