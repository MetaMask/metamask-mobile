import { getLighterHttpEndpoint } from '@metamask/perps-controller/constants/lighterConfig';
import Engine from '../../../../core/Engine';

const LIGHTER_OK_CODE = 200;

interface LighterAccountBody {
  code?: number;
  message?: string;
  accounts?: { available_balance?: string }[];
}

/**
 * Withdrawable Lighter balance from the Lighter entry of
 * `PerpsController.getAccountState()`. The controller only returns it in
 * aggregated mode, so this is `undefined` in direct Hyperliquid mode.
 *
 * @returns Human-readable USDC balance, or `undefined` when the controller has
 * no available Lighter balance.
 */
async function fetchLighterBalanceFromController(): Promise<
  string | undefined
> {
  const accountState = await Engine.context.PerpsController.getAccountState();
  const lighter = accountState.providerStates?.lighter;

  return lighter?.status === 'available'
    ? lighter.state.withdrawableBalance
    : undefined;
}

/**
 * TEMPORARY FALLBACK. Remove this (and the `l1Address` argument) once the Perps
 * code returns the Lighter balance in every provider mode, i.e. once
 * `providerStates.lighter` is available outside aggregated mode. Until then the
 * controller has no Lighter data when it runs in direct Hyperliquid mode, which
 * is the default.
 *
 * @param l1Address - EVM address of the logged-in user.
 * @returns Human-readable USDC balance, or `undefined` when the address has no
 * Lighter account.
 */
async function fetchLighterBalanceFromApi(
  l1Address: string,
): Promise<string | undefined> {
  const url = `${getLighterHttpEndpoint('mainnet')}/api/v1/account?by=l1_address&value=${l1Address}`;
  const response = await fetch(url);
  const body = (await response.json()) as LighterAccountBody;

  if (!response.ok || body.code !== LIGHTER_OK_CODE) {
    // Lighter answers 400 when the address has no account.
    if (response.status === 400) {
      return undefined;
    }
    throw new Error(
      body.message ?? `Lighter balance lookup failed (${response.status})`,
    );
  }

  const balance = body.accounts?.[0]?.available_balance;
  return balance === '' ? undefined : balance;
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
  const fromController = await fetchLighterBalanceFromController().catch(
    () => undefined,
  );

  // TODO: remove the fallback once the Perps code works in every provider mode.
  return fromController ?? fetchLighterBalanceFromApi(l1Address);
}
