import { PERPS_CONSTANTS } from "../constants/perpsConfig.mjs";
const EVM_ACCOUNT_TYPES = new Set(['eip155:eoa', 'eip155:erc4337']);
function isEvmAccountType(type) {
    return EVM_ACCOUNT_TYPES.has(type);
}
export function findEvmAccount(accounts) {
    const evmAccount = accounts.find((account) => account && isEvmAccountType(account.type));
    return evmAccount ?? null;
}
export function getEvmAccountFromAccountGroup(accounts) {
    const evmAccount = findEvmAccount(accounts);
    return evmAccount ? { address: evmAccount.address } : undefined;
}
export function getSelectedEvmAccount(accounts) {
    return getEvmAccountFromAccountGroup(accounts);
}
function isAccountLike(value) {
    const account = value;
    return (typeof value === 'object' &&
        value !== null &&
        typeof account?.address === 'string' &&
        typeof account.type === 'string');
}
export function getSelectedEvmAccountDetailsFromMessenger(messenger) {
    try {
        const selectedAccount = messenger.call('AccountsController:getSelectedAccount');
        if (isAccountLike(selectedAccount)) {
            const evmAccount = findEvmAccount([selectedAccount]);
            if (evmAccount) {
                return evmAccount;
            }
        }
    }
    catch {
        // Fall back to the selected account group if the direct lookup is unavailable.
    }
    try {
        const selectedAccountGroup = messenger.call('AccountTreeController:getAccountsFromSelectedAccountGroup');
        return Array.isArray(selectedAccountGroup)
            ? (findEvmAccount(selectedAccountGroup.filter(isAccountLike)) ??
                undefined)
            : undefined;
    }
    catch {
        return undefined;
    }
}
export function getSelectedEvmAccountFromMessenger(messenger) {
    const evmAccount = getSelectedEvmAccountDetailsFromMessenger(messenger);
    return evmAccount ? { address: evmAccount.address } : undefined;
}
export function calculateWeightedReturnOnEquity(accounts) {
    if (accounts.length === 0) {
        return '0';
    }
    let totalWeightedROE = 0;
    let totalMarginUsed = 0;
    for (const account of accounts) {
        const unrealizedPnl = typeof account.unrealizedPnl === 'string'
            ? Number.parseFloat(account.unrealizedPnl)
            : account.unrealizedPnl;
        const returnOnEquity = typeof account.returnOnEquity === 'string'
            ? Number.parseFloat(account.returnOnEquity)
            : account.returnOnEquity;
        if (Number.isNaN(unrealizedPnl) || Number.isNaN(returnOnEquity)) {
            continue;
        }
        if (returnOnEquity === 0) {
            continue;
        }
        const marginUsed = (unrealizedPnl / returnOnEquity) * 100;
        if (Number.isNaN(marginUsed) || marginUsed <= 0) {
            continue;
        }
        const roeDecimal = returnOnEquity / 100;
        totalWeightedROE += roeDecimal * marginUsed;
        totalMarginUsed += marginUsed;
    }
    if (totalMarginUsed <= 0) {
        return '0';
    }
    const weightedROE = (totalWeightedROE / totalMarginUsed) * 100;
    return weightedROE.toString();
}
// The release-branch balance bridge is USDC-only. Non-USDC spot assets must
// not inflate the balances shown or validated by withdraw/payment flows.
const SPOT_COLLATERAL_COINS = new Set(['USDC']);
export function getSpotBalance(spotState) {
    if (!spotState?.balances || !Array.isArray(spotState.balances)) {
        return 0;
    }
    return spotState.balances.reduce((sum, balance) => {
        if (!balance.coin || !SPOT_COLLATERAL_COINS.has(balance.coin)) {
            return sum;
        }
        const value = parseFloat(balance.total ?? '0');
        return Number.isFinite(value) ? sum + value : sum;
    }, 0);
}
export function getSpotHold(spotState) {
    if (!spotState?.balances || !Array.isArray(spotState.balances)) {
        return 0;
    }
    return spotState.balances.reduce((sum, balance) => {
        if (!balance.coin || !SPOT_COLLATERAL_COINS.has(balance.coin)) {
            return sum;
        }
        const value = parseFloat(balance.hold ?? '0');
        return Number.isFinite(value) ? sum + value : sum;
    }, 0);
}
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
export function addSpotBalanceToAccountState(accountState, spotState, options) {
    // Fail-closed default: align with `hyperLiquidModeFoldsSpot(null) → false`.
    // A caller that omits `options` should NOT silently fold spot — that would
    // over-report withdrawable funds for Standard / dexAbstraction users.
    const foldIntoCollateral = options?.foldIntoCollateral ?? false;
    const spotBalance = getSpotBalance(spotState);
    const spotHold = getSpotHold(spotState);
    const freeSpot = Math.max(0, spotBalance - spotHold);
    const currentTotal = parseFloat(accountState.totalBalance);
    const currentSpendable = parseFloat(accountState.spendableBalance);
    const currentWithdrawable = parseFloat(accountState.withdrawableBalance);
    // Preserve sentinel totals (e.g. PERPS_CONSTANTS.FallbackDataDisplay '--')
    // rather than coercing them to NaN.
    if (!Number.isFinite(currentTotal)) {
        return accountState;
    }
    if (spotBalance === 0) {
        // No spot wealth means no hold either in the HL payload shape, so the
        // later totalBalance adjustment would also be a no-op.
        return accountState;
    }
    // Folding is gated strictly on the resolved abstraction mode (see callers'
    // `foldIntoCollateral` argument). Standard / DEX-abstraction users keep
    // perps and spot independent, so spot must NOT surface as a perps-
    // withdrawable balance for them — withdraw3 only draws from the perps
    // ledger in those modes. Unified / portfolio-margin users get the fold;
    // live callers fail-CLOSED via `hyperLiquidModeFoldsSpot` when mode is
    // unresolved.
    const nextSpendable = resolveFoldedBalance(currentSpendable, accountState.spendableBalance, freeSpot, foldIntoCollateral);
    const nextWithdrawable = resolveFoldedBalance(currentWithdrawable, accountState.withdrawableBalance, freeSpot, foldIntoCollateral);
    // Total always reflects combined wealth: subtract spotHold to avoid
    // double-counting on Unified/PM accounts where marginSummary.accountValue
    // already includes the margin that HL surfaces via spot.hold. Standard
    // mode has spotHold = 0 by construction, so the subtraction is a no-op.
    const nextTotal = currentTotal + spotBalance - spotHold;
    return {
        ...accountState,
        totalBalance: nextTotal.toString(),
        spendableBalance: nextSpendable,
        withdrawableBalance: nextWithdrawable,
    };
}
function resolveFoldedBalance(currentNumeric, currentRaw, freeSpot, foldIntoCollateral) {
    if (!foldIntoCollateral) {
        return currentRaw;
    }
    if (Number.isFinite(currentNumeric)) {
        return (currentNumeric + freeSpot).toString();
    }
    // Non-finite currentNumeric means the adapter passed a sentinel like
    // `PERPS_CONSTANTS.FallbackDataDisplay` ("--") during loading. Preserve
    // the sentinel rather than synthesising a numeric fold; the caller's
    // UI treats "--" as "loading" and would otherwise show a misleading
    // spot-only figure while the per-DEX perps fetch is still in flight.
    return currentRaw;
}
/**
 * Aggregate multiple per-DEX AccountState objects into one by summing numeric fields.
 * ROE is recalculated as (totalUnrealizedPnl / totalMarginUsed) * 100.
 *
 * @param states - The array of per-DEX account states to aggregate.
 * @returns The combined account state with summed balances and recalculated ROE.
 */
export function aggregateAccountStates(states) {
    const fallback = {
        spendableBalance: PERPS_CONSTANTS.FallbackDataDisplay,
        withdrawableBalance: PERPS_CONSTANTS.FallbackDataDisplay,
        totalBalance: PERPS_CONSTANTS.FallbackDataDisplay,
        marginUsed: PERPS_CONSTANTS.FallbackDataDisplay,
        unrealizedPnl: PERPS_CONSTANTS.FallbackDataDisplay,
        returnOnEquity: PERPS_CONSTANTS.FallbackDataDisplay,
    };
    if (states.length === 0) {
        return fallback;
    }
    const aggregated = states.reduce((acc, state, index) => {
        if (index === 0) {
            return { ...state };
        }
        return {
            spendableBalance: (parseFloat(acc.spendableBalance) + parseFloat(state.spendableBalance)).toString(),
            withdrawableBalance: (parseFloat(acc.withdrawableBalance) +
                parseFloat(state.withdrawableBalance)).toString(),
            totalBalance: (parseFloat(acc.totalBalance) + parseFloat(state.totalBalance)).toString(),
            marginUsed: (parseFloat(acc.marginUsed) + parseFloat(state.marginUsed)).toString(),
            unrealizedPnl: (parseFloat(acc.unrealizedPnl) + parseFloat(state.unrealizedPnl)).toString(),
            returnOnEquity: '0',
        };
    }, fallback);
    // Recalculate ROE across all DEXs
    const totalMarginUsed = parseFloat(aggregated.marginUsed);
    const totalUnrealizedPnl = parseFloat(aggregated.unrealizedPnl);
    if (totalMarginUsed > 0) {
        aggregated.returnOnEquity = ((totalUnrealizedPnl / totalMarginUsed) *
            100).toString();
    }
    else {
        aggregated.returnOnEquity = '0';
    }
    return aggregated;
}
//# sourceMappingURL=accountUtils.mjs.map