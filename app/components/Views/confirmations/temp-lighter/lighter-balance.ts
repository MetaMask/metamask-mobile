import { getLighterHttpEndpoint } from '@metamask/perps-controller/constants/lighterConfig';
import { LIGHTER_ACCOUNT_NOT_FOUND_CODE } from './lighter-usdc-deposit';

/**
 * Temporary. Perps should own the Lighter balance lookup (likely in
 * `PerpsController`). Move this out of confirmations once the perps package
 * exports it, and delete this file.
 */

const LIGHTER_OK_CODE = 200;

interface LighterAccountBody {
  code?: number;
  message?: string;
  accounts?: { available_balance?: string }[];
}

/**
 * Withdrawable Lighter perps balance for an L1 address.
 *
 * @param l1Address - EVM address of the logged-in user.
 * @returns Human-readable USDC balance, or `undefined` when the address has no
 * Lighter account.
 */
export async function fetchLighterWithdrawableBalance(
  l1Address: string,
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

  const balance = body.accounts?.[0]?.available_balance;
  return balance === '' ? undefined : balance;
}
