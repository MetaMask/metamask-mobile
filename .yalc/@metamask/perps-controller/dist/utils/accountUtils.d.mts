/**
 * Account utilities for Perps components
 * Handles account selection and EVM account filtering
 */
import type { InternalAccount } from "@metamask/keyring-internal-api";
import type { SpotClearinghouseStateResponse } from "../types/hyperliquid-types.mjs";
import type { AccountState, PerpsInternalAccount } from "../types/index.mjs";
export declare function findEvmAccount(accounts: (InternalAccount | PerpsInternalAccount)[]): InternalAccount | PerpsInternalAccount | null;
export declare function getEvmAccountFromAccountGroup(accounts: (InternalAccount | PerpsInternalAccount)[]): {
    address: string;
} | undefined;
export declare function getSelectedEvmAccount(accounts: (InternalAccount | PerpsInternalAccount)[]): {
    address: string;
} | undefined;
type SelectedEvmAccountMessenger = {
    call(actionType: 'AccountsController:getSelectedAccount' | 'AccountTreeController:getAccountsFromSelectedAccountGroup'): unknown;
};
export declare function getSelectedEvmAccountDetailsFromMessenger(messenger: SelectedEvmAccountMessenger): InternalAccount | PerpsInternalAccount | undefined;
export declare function getSelectedEvmAccountFromMessenger(messenger: SelectedEvmAccountMessenger): {
    address: string;
} | undefined;
export type ReturnOnEquityInput = {
    unrealizedPnl: string | number;
    returnOnEquity: string | number;
};
export declare function calculateWeightedReturnOnEquity(accounts: ReturnOnEquityInput[]): string;
export declare function getSpotBalance(spotState?: SpotClearinghouseStateResponse | null): number;
export declare function getSpotHold(spotState?: SpotClearinghouseStateResponse | null): number;
/**
 * Options controlling how `addSpotBalanceToAccountState` folds spot balance
 * into the three-field AccountState contract.
 */
export type AddSpotBalanceOptions = {
    /**
     * When `true`, free spot USDC contributes to both `spendableBalance` and
     * `withdrawableBalance` in addition to `totalBalance` — appropriate for
     * venues where spot is automatically used as perps collateral (e.g.
     * HyperLiquid Unified/Portfolio mode, where `withdraw3` draws from the
     * unified ledger).
     *
     * When `false`, free spot contributes to `totalBalance` only; spendable
     * and withdrawable stay perps-only — appropriate for venues where spot
     * is a separate ledger the backend cannot auto-draw from (e.g. HL
     * Standard mode). The caller is responsible for translating
     * provider-specific state into this flag.
     *
     * Defaults to `true` for backward compatibility with call sites that
     * haven't yet been wired with provider-specific context.
     */
    foldIntoCollateral?: boolean;
};
/**
 * Add spot USDC to the AccountState contract. Caller decides whether the
 * spot balance counts as perps collateral via `options.foldIntoCollateral`
 * — the util stays provider-agnostic.
 *
 * @param accountState - Base AccountState produced by a provider adapter.
 * @param spotState - Raw spot clearinghouse response (HL-shaped); null or missing means no spot balance and the state is returned unchanged.
 * @param options - See {@link AddSpotBalanceOptions}.
 * @returns AccountState with spot folded into `totalBalance` always, and into spendable/withdrawable when `foldIntoCollateral` is true.
 */
export declare function addSpotBalanceToAccountState(accountState: AccountState, spotState?: SpotClearinghouseStateResponse | null, options?: AddSpotBalanceOptions): AccountState;
/**
 * Aggregate multiple per-DEX AccountState objects into one by summing numeric fields.
 * ROE is recalculated as (totalUnrealizedPnl / totalMarginUsed) * 100.
 *
 * @param states - The array of per-DEX account states to aggregate.
 * @returns The combined account state with summed balances and recalculated ROE.
 */
export declare function aggregateAccountStates(states: AccountState[]): AccountState;
export {};
//# sourceMappingURL=accountUtils.d.mts.map