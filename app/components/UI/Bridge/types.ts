import {
  Intent,
  QuoteMetadata,
  QuoteResponse,
} from '@metamask/bridge-controller';
import { Asset, TokenRwaData } from '@metamask/assets-controllers';
import { Hex, CaipChainId } from '@metamask/utils';

// This is slightly different from the BridgeToken type in @metamask/bridge-controller
export interface BridgeToken {
  address: string;
  name?: string;
  symbol: string;
  image?: string;
  decimals: number;
  chainId: Hex | CaipChainId;
  // A non-truncated non-atomic balance, e.g. 1.23456789,
  // can always do calculations on this, regardless of small numbers
  // I.e. will NOT be "< 0.00001" like TokenI.balance
  balance?: string;
  balanceFiat?: string; // A formatted fiat value, e.g. "$100.12345", "100.12345 cad"
  tokenFiatAmount?: number; // A sortable fiat value in the user's currency, e.g. 100.12345
  currencyExchangeRate?: number; // A rate of the token in the user's currency, e.g. 100.12345
  accountType?: Asset['accountType'];
  noFee?: {
    isSource: boolean;
    isDestination: boolean;
  };
  aggregators?: string[];
  metadata?: Record<string, unknown>;
  rwaData?: TokenRwaData;
}

export type BridgeQuoteResponse = QuoteResponse &
  QuoteMetadata & {
    aggregator: string;
    walletAddress: string;
    intent?: Intent;
  };

export enum BridgeViewMode {
  Swap = 'Swap',
  Bridge = 'Bridge',
  Unified = 'Unified',
}

export type SlippageType = string;

export interface BridgeSlippageConfig {
  /**
   * This is a wildcard that is enabled by default for all
   * networks. Users can override this object for any supported
   * network by provided the CaipChainId as property key.
   *
   * Any configuration properties that are not defined will
   * default to the values specified here.
   *
   * Configuration grouping is handled per network family.
   *
   * Please note that for slippage threshold configuration values
   * should be defined in range:
   *
   * `lower_allowed_slippage_threshold.value` less than
   * `lower_suggested_slippage_threshold.value` less than
   * `upper_suggested_slippage_threshold` less than
   * `upper_allowed_slippage_threshold`
   *
   * All the above values are optional.
   */
  __default__: {
    /** Input stepper increase/decrease change in %. */
    readonly input_step: number;
    /** Max allowed slippage value in %. (inclusive) */
    readonly max_amount: number;
    /** Min allowed slippage value in %. (inclusive) */
    readonly min_amount: number;
    /** Maximum allowed decimals for slippage input. */
    readonly input_max_decimals: number;
    /**
     * Configuration related to error messages rendered
     * based on `messageId` (localized key)
     * when user input an amount that is LESS OR EQUAL than `value` in %,
     * if `inclusive` is true, else it is strictly LESS than `value.
     *
     * This value is optional and can be replaced by `null`
     */
    readonly lower_allowed_slippage_threshold: {
      readonly messageId: string;
      readonly value: number;
      readonly inclusive: boolean;
    } | null;
    /**
     * Configuration related to warning messages rendered
     * based on `messageId` (localized key)
     * when user input an amount that is LESS OR EQUAL than `value` in %,
     * if `inclusive` is true, else it is strictly LESS than `value.
     *
     * This value is optional and can be replaced by `null`
     */
    readonly lower_suggested_slippage_threshold: {
      readonly messageId: string;
      readonly value: number;
      readonly inclusive: boolean;
    } | null;
    /**
     * Configuration related to warning messages rendered
     * based on `messageId` (localized key)
     * when user input an amount that is MORE OR EQUAL than `value` in %,
     * if `inclusive` is true, else it is strictly MORE than `value.
     *
     * This value is optional and can be replaced by `null`
     */
    readonly upper_suggested_slippage_threshold: {
      readonly messageId: string;
      readonly value: number;
      readonly inclusive: boolean;
    } | null;

    /**
     * Configuration related to error messages rendered
     * based on `messageId` (localized key)
     * when user input an amount that is MORE OR EQUAL than `value` in %,
     * if `inclusive` is true, else it is strictly MORE than `value.
     *
     * This value is optional and can be replaced by `null`
     */
    readonly upper_allowed_slippage_threshold: {
      readonly messageId: string;
      readonly value: number;
      readonly inclusive: boolean;
    } | null;
    /**
     * Default slippage choices presented to user.
     * Values are defined in %.
     *
     * !!IMPORTANT!!
     * - Each value defined needs to be in range [min_amount, max_amount]
     * - A special value `auto` is supported which let the aggregator define the value of slippage.
     */
    readonly default_slippage_options: readonly string[];
    /** Flag denoting if custom slippage input is supported. */
    readonly has_custom_slippage_option: boolean;
  };
  /**
   * Override default slippage options on Solana.
   */
  [key: CaipChainId]: Partial<BridgeSlippageConfig['__default__']>;
}

export enum TokenSelectorType {
  Source = 'source',
  Dest = 'dest',
}
