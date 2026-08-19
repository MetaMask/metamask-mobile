/**
 * Error codes for PerpsController
 * These codes are returned to the UI layer for translation
 * Extracted to separate file to avoid circular dependencies with translatePerpsError
 */
export const PERPS_ERROR_CODES = {
    CLIENT_NOT_INITIALIZED: 'CLIENT_NOT_INITIALIZED',
    CLIENT_REINITIALIZING: 'CLIENT_REINITIALIZING',
    PROVIDER_NOT_AVAILABLE: 'PROVIDER_NOT_AVAILABLE',
    TOKEN_NOT_SUPPORTED: 'TOKEN_NOT_SUPPORTED',
    BRIDGE_CONTRACT_NOT_FOUND: 'BRIDGE_CONTRACT_NOT_FOUND',
    WITHDRAW_FAILED: 'WITHDRAW_FAILED',
    POSITIONS_FAILED: 'POSITIONS_FAILED',
    ACCOUNT_STATE_FAILED: 'ACCOUNT_STATE_FAILED',
    MARKETS_FAILED: 'MARKETS_FAILED',
    UNKNOWN_ERROR: 'UNKNOWN_ERROR',
    // Provider-agnostic order errors
    ORDER_LEVERAGE_REDUCTION_FAILED: 'ORDER_LEVERAGE_REDUCTION_FAILED',
    // HyperLiquid-specific order errors
    IOC_CANCEL: 'IOC_CANCEL', // Order could not immediately match (insufficient liquidity)
    // Connection errors
    CONNECTION_TIMEOUT: 'CONNECTION_TIMEOUT',
    // Validation errors - withdraw
    WITHDRAW_ASSET_ID_REQUIRED: 'WITHDRAW_ASSET_ID_REQUIRED',
    WITHDRAW_AMOUNT_REQUIRED: 'WITHDRAW_AMOUNT_REQUIRED',
    WITHDRAW_AMOUNT_POSITIVE: 'WITHDRAW_AMOUNT_POSITIVE',
    WITHDRAW_INVALID_DESTINATION: 'WITHDRAW_INVALID_DESTINATION',
    WITHDRAW_ASSET_NOT_SUPPORTED: 'WITHDRAW_ASSET_NOT_SUPPORTED',
    WITHDRAW_INSUFFICIENT_BALANCE: 'WITHDRAW_INSUFFICIENT_BALANCE',
    // Validation errors - deposit
    DEPOSIT_ASSET_ID_REQUIRED: 'DEPOSIT_ASSET_ID_REQUIRED',
    DEPOSIT_AMOUNT_REQUIRED: 'DEPOSIT_AMOUNT_REQUIRED',
    DEPOSIT_AMOUNT_POSITIVE: 'DEPOSIT_AMOUNT_POSITIVE',
    DEPOSIT_MINIMUM_AMOUNT: 'DEPOSIT_MINIMUM_AMOUNT',
    // Validation errors - order
    ORDER_COIN_REQUIRED: 'ORDER_COIN_REQUIRED',
    ORDER_LIMIT_PRICE_REQUIRED: 'ORDER_LIMIT_PRICE_REQUIRED',
    ORDER_PRICE_POSITIVE: 'ORDER_PRICE_POSITIVE',
    ORDER_UNKNOWN_COIN: 'ORDER_UNKNOWN_COIN',
    ORDER_SIZE_POSITIVE: 'ORDER_SIZE_POSITIVE',
    ORDER_PRICE_REQUIRED: 'ORDER_PRICE_REQUIRED',
    ORDER_SIZE_MIN: 'ORDER_SIZE_MIN',
    ORDER_LEVERAGE_INVALID: 'ORDER_LEVERAGE_INVALID',
    ORDER_LEVERAGE_BELOW_POSITION: 'ORDER_LEVERAGE_BELOW_POSITION',
    ORDER_MAX_VALUE_EXCEEDED: 'ORDER_MAX_VALUE_EXCEEDED',
    // Validation errors - trigger placement (stop / take profit) and partial TP/SL
    ORDER_TRIGGER_PRICE_REQUIRED: 'ORDER_TRIGGER_PRICE_REQUIRED', // stop_*/take_profit_* placed without a trigger price
    ORDER_TRIGGER_PRICE_POSITIVE: 'ORDER_TRIGGER_PRICE_POSITIVE',
    ORDER_TRIGGER_PRICE_NOT_SUPPORTED: 'ORDER_TRIGGER_PRICE_NOT_SUPPORTED', // Trigger price supplied for a market/limit order
    ORDER_TRIGGER_TPSL_UNSUPPORTED: 'ORDER_TRIGGER_TPSL_UNSUPPORTED', // Attached TP/SL on a trigger placement
    ORDER_TPSL_SIZE_INVALID: 'ORDER_TPSL_SIZE_INVALID', // Partial TP/SL size non-positive, larger than the order, or missing its price
    ORDER_EDIT_TRIGGER_UNSUPPORTED: 'ORDER_EDIT_TRIGGER_UNSUPPORTED', // editOrder cannot turn a resting order into a trigger placement
    ORDER_TPSL_LINKAGE_CONFLICT: 'ORDER_TPSL_LINKAGE_CONFLICT', // tpslLinkage and the deprecated grouping disagree
    ORDER_TPSL_POSITION_LINKAGE_UNSUPPORTED: 'ORDER_TPSL_POSITION_LINKAGE_UNSUPPORTED', // Position-linked TP/SL requested on an order placement; use updatePositionTPSL
    ORDER_TPSL_LINKAGE_REQUIRED: 'ORDER_TPSL_LINKAGE_REQUIRED', // Attached TP/SL requested with no linkage to parent or position
    ORDER_EDIT_ORDER_UNVERIFIABLE: 'ORDER_EDIT_ORDER_UNVERIFIABLE', // editOrder cannot confirm the resting order's placement type
    ORDER_TIME_IN_FORCE_NOT_SUPPORTED: 'ORDER_TIME_IN_FORCE_NOT_SUPPORTED', // Time in force supplied for an order shape that cannot carry one
    // Validation errors - strategy placement (twap / scale / chase)
    ORDER_STRATEGY_PARAMS_NOT_SUPPORTED: 'ORDER_STRATEGY_PARAMS_NOT_SUPPORTED', // Strategy field supplied on an order type that does not own it
    ORDER_STRATEGY_FIELD_UNSUPPORTED: 'ORDER_STRATEGY_FIELD_UNSUPPORTED', // price / triggerPrice / timeInForce / attached TP/SL supplied on a strategy placement
    ORDER_STRATEGY_MARKET_UNSUPPORTED: 'ORDER_STRATEGY_MARKET_UNSUPPORTED', // The provider cannot run a strategy placement on this market
    ORDER_STRATEGY_HANDLE_UNKNOWN: 'ORDER_STRATEGY_HANDLE_UNKNOWN', // Cancel referenced a scale group or chase session this provider does not hold
    ORDER_EDIT_STRATEGY_UNSUPPORTED: 'ORDER_EDIT_STRATEGY_UNSUPPORTED', // editOrder cannot modify a strategy placement; cancel by its handle and place again
    ORDER_STRATEGY_CANCEL_INCOMPLETE: 'ORDER_STRATEGY_CANCEL_INCOMPLETE', // Part of a strategy placement is still resting after a cancel; the handle stays valid for a retry
    ORDER_TWAP_DURATION_REQUIRED: 'ORDER_TWAP_DURATION_REQUIRED', // TWAP placed without twapDuration
    ORDER_TWAP_DURATION_INVALID: 'ORDER_TWAP_DURATION_INVALID', // twapDuration not a whole number of minutes within the venue's bounds
    ORDER_SCALE_RANGE_REQUIRED: 'ORDER_SCALE_RANGE_REQUIRED', // Scale placed without both ladder bounds
    ORDER_SCALE_RANGE_INVALID: 'ORDER_SCALE_RANGE_INVALID', // Scale ladder bounds non-positive or inverted
    ORDER_SCALE_COUNT_INVALID: 'ORDER_SCALE_COUNT_INVALID', // scaleNumOrders missing, non-integer, or outside the supported ladder size
    ORDER_SCALE_SIZE_TOO_SMALL: 'ORDER_SCALE_SIZE_TOO_SMALL', // Total size cannot give every ladder rung a non-zero slice
    ORDER_SCALE_NOTIONAL_TOO_SMALL: 'ORDER_SCALE_NOTIONAL_TOO_SMALL', // Ladder notional split across the rungs leaves each below the venue's per-order minimum
    ORDER_TWAP_NOTIONAL_TOO_SMALL: 'ORDER_TWAP_NOTIONAL_TOO_SMALL', // TWAP total below the venue's documented minimum TWAP order size
    ORDER_CHASE_INTERVAL_INVALID: 'ORDER_CHASE_INTERVAL_INVALID', // chaseIntervalMs below the minimum poll interval
    ORDER_CHASE_DURATION_INVALID: 'ORDER_CHASE_DURATION_INVALID', // chaseMaxDurationMs shorter than one poll interval, or chaseMaxRepricings non-positive
    ORDER_CHASE_ABANDONED: 'ORDER_CHASE_ABANDONED', // The provider was torn down while the chase was being placed; its order rests but no strategy runs
    ORDER_CHASE_LIMIT_REACHED: 'ORDER_CHASE_LIMIT_REACHED', // The venue's cap on simultaneously active chase orders is already in use
    ORDER_CHASE_TOUCH_UNAVAILABLE: 'ORDER_CHASE_TOUCH_UNAVAILABLE', // The order book returned no price on the side the chase must rest at
    // HyperLiquid client/service errors
    EXCHANGE_CLIENT_NOT_AVAILABLE: 'EXCHANGE_CLIENT_NOT_AVAILABLE',
    INFO_CLIENT_NOT_AVAILABLE: 'INFO_CLIENT_NOT_AVAILABLE',
    SUBSCRIPTION_CLIENT_NOT_AVAILABLE: 'SUBSCRIPTION_CLIENT_NOT_AVAILABLE',
    // Wallet/account errors
    NO_ACCOUNT_SELECTED: 'NO_ACCOUNT_SELECTED',
    KEYRING_LOCKED: 'KEYRING_LOCKED',
    INVALID_ADDRESS_FORMAT: 'INVALID_ADDRESS_FORMAT',
    // Wallet has no account on the exchange yet (HyperLiquid creates accounts
    // server-side on the first USDC credit). Actionable: the user must fund the
    // account before any order can be placed.
    EXCHANGE_ACCOUNT_NOT_FOUND: 'EXCHANGE_ACCOUNT_NOT_FOUND',
    // HyperLiquid exchange rejects agent-signed writes for multi-sig accounts
    // without a multi-sig wrapper, or when the action nonce is stale/reused.
    EXCHANGE_MULTI_SIG_REQUIRED: 'EXCHANGE_MULTI_SIG_REQUIRED',
    EXCHANGE_INVALID_NONCE: 'EXCHANGE_INVALID_NONCE',
    // Transfer/swap errors
    TRANSFER_FAILED: 'TRANSFER_FAILED',
    SWAP_FAILED: 'SWAP_FAILED',
    SPOT_PAIR_NOT_FOUND: 'SPOT_PAIR_NOT_FOUND',
    PRICE_UNAVAILABLE: 'PRICE_UNAVAILABLE',
    // Market/collateral errors
    UNSUPPORTED_COLLATERAL: 'UNSUPPORTED_COLLATERAL', // DEX collateral token is not USDC (TAT-3304)
    // Batch operation errors
    BATCH_CANCEL_FAILED: 'BATCH_CANCEL_FAILED',
    BATCH_CLOSE_FAILED: 'BATCH_CLOSE_FAILED',
    // Position/margin errors
    INSUFFICIENT_MARGIN: 'INSUFFICIENT_MARGIN',
    INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
    REDUCE_ONLY_VIOLATION: 'REDUCE_ONLY_VIOLATION',
    POSITION_WOULD_FLIP: 'POSITION_WOULD_FLIP',
    MARGIN_ADJUSTMENT_FAILED: 'MARGIN_ADJUSTMENT_FAILED',
    TPSL_UPDATE_FAILED: 'TPSL_UPDATE_FAILED',
    // Order execution errors
    ORDER_REJECTED: 'ORDER_REJECTED',
    SLIPPAGE_EXCEEDED: 'SLIPPAGE_EXCEEDED',
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
    // Network/service errors
    SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
    NETWORK_ERROR: 'NETWORK_ERROR',
};
//# sourceMappingURL=perpsErrorCodes.mjs.map