import Engine from '../../../../core/Engine';

/**
 * Withdrawable Lighter perps balance of the selected account, read from the
 * Lighter entry of `PerpsController.getAccountState()`.
 *
 * @returns Human-readable USDC balance, or `undefined` when Lighter reports no
 * available balance for the account.
 */
export async function fetchLighterWithdrawableBalance(): Promise<
  string | undefined
> {
  const accountState = await Engine.context.PerpsController.getAccountState();
  const lighter = accountState.providerStates?.lighter;

  return lighter?.status === 'available'
    ? lighter.state.withdrawableBalance
    : undefined;
}
