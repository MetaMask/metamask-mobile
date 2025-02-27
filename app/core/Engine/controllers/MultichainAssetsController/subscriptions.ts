/**
 * Sets up subscription to sync CurrencyRateController changes with RatesController
 * @param controllerMessenger - The main controller messenger
 * @param ratesController - The RatesController instance to sync with
 */
export const setupMultichainAssetsSync = (
  controllerMessenger: unknown,
): void => {
  controllerMessenger.subscribe(
    'AccountsController:accountBalancesUpdated',
    (state: unknown) => {
      // eslint-disable-next-line no-console
      console.log('setupMultichainAssetsSync called with ', state);
    },
  );
};
