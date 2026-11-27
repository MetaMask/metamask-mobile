import { getLighterHttpEndpoint } from '@metamask/perps-controller/constants/lighterConfig';
import { BigNumber } from 'bignumber.js';
import Engine from '../../../../core/Engine';
import { LIGHTER_ACCOUNT_NOT_FOUND_CODE } from './lighter-usdc-deposit';

const LIGHTER_OK_CODE = 200;

interface LighterAccountBody {
  code?: number;
  message?: string;
  accounts?: {
    available_balance?: string;
    collateral?: string;
    positions?: { unrealized_pnl?: string }[];
  }[];
}

type LighterBalanceKind = 'total' | 'withdrawable';

/**
 * Lighter balance from the Lighter entry of
 * `PerpsController.getAccountState()`. The controller only returns it in
 * aggregated mode, so this is `undefined` in direct Hyperliquid mode.
 *
 * @param kind - `withdrawable` for the balance that can be withdrawn, `total`
 * for the account value including unrealized PnL.
 * @returns Human-readable USDC balance, or `undefined` when the controller has
 * no available Lighter balance.
 */
async function fetchLighterBalanceFromController(
  kind: LighterBalanceKind,
): Promise<string | undefined> {
  const accountState = await Engine.context.PerpsController.getAccountState();
  const lighter = accountState.providerStates?.lighter;

  if (lighter?.status !== 'available') {
    return undefined;
  }

  return kind === 'total'
    ? lighter.state.totalBalance
    : lighter.state.withdrawableBalance;
}

/**
 * TEMPORARY FALLBACK. Remove this (and the `l1Address` argument) once the Perps
 * code returns the Lighter balance in every provider mode, i.e. once
 * `providerStates.lighter` is available outside aggregated mode. Until then the
 * controller has no Lighter data when it runs in direct Hyperliquid mode, which
 * is the default.
 *
 * @param l1Address - EVM address of the logged-in user.
 * @param kind - `withdrawable` for the available balance, `total` for the
 * collateral plus the unrealized PnL of the open positions, as the controller
 * computes it.
 * @returns Human-readable USDC balance, or `undefined` when the address has no
 * Lighter account.
 */
async function fetchLighterBalanceFromApi(
  l1Address: string,
  kind: LighterBalanceKind,
): Promise<string | undefined> {
  const url = `${getLighterHttpEndpoint('mainnet')}/api/v1/account?by=l1_address&value=${l1Address}`;
  const response = await fetch(url);
  const body = (await response.json()) as LighterAccountBody;

  // Lighter answers 400 with this code when the address has no account. Any
  // other failure, including other 400s, is thrown so it is not read as an
  // empty balance.
  if (body.code === LIGHTER_ACCOUNT_NOT_FOUND_CODE) {
    return undefined;
  }

  if (!response.ok || body.code !== LIGHTER_OK_CODE) {
    throw new Error(
      body.message ?? `Lighter balance lookup failed (${response.status})`,
    );
  }

  const account = body.accounts?.[0];

  if (kind === 'withdrawable') {
    const balance = account?.available_balance;
    return balance === '' ? undefined : balance;
  }

  if (!account?.collateral) {
    return undefined;
  }

  return (account.positions ?? [])
    .reduce(
      (total, { unrealized_pnl: unrealizedPnl }) =>
        unrealizedPnl ? total.plus(unrealizedPnl) : total,
      new BigNumber(account.collateral),
    )
    .toString(10);
}

async function fetchLighterBalance(
  l1Address: string,
  kind: LighterBalanceKind,
): Promise<string | undefined> {
  const fromController = await fetchLighterBalanceFromController(kind).catch(
    () => undefined,
  );

  // TODO: remove the fallback once the Perps code works in every provider mode.
  return fromController ?? fetchLighterBalanceFromApi(l1Address, kind);
}

/**
 * Withdrawable Lighter perps balance. Reads the controller first and falls
 * back to the Lighter API when the controller has no Lighter data.
 *
 * @param l1Address - EVM address of the logged-in user, used by the fallback.
 * @returns Human-readable USDC balance, or `undefined` when none is available.
 */
export async function fetchLighterWithdrawableBalance(
  l1Address: string,
): Promise<string | undefined> {
  return fetchLighterBalance(l1Address, 'withdrawable');
}

/**
 * Total Lighter perps balance (collateral plus unrealized PnL), the same
 * measure `perpsBalances` and the Hyperliquid account balance use. Reads the
 * controller first and falls back to the Lighter API.
 *
 * @param l1Address - EVM address of the logged-in user, used by the fallback.
 * @returns Human-readable USDC balance, or `undefined` when none is available.
 */
export async function fetchLighterTotalBalance(
  l1Address: string,
): Promise<string | undefined> {
  return fetchLighterBalance(l1Address, 'total');
}
