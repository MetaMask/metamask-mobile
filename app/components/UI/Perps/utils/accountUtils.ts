/**
 * Account utilities for Perps components
 * Handles account selection and EVM account filtering
 */
import Engine from '../../../../core/Engine';

/**
 * Gets the EVM account from the selected account group
 * Extracts the duplicated pattern used throughout PerpsController
 *
 * @returns EVM account or null if not found
 */
export const getEvmAccountFromSelectedAccountGroup = () => {
  const { AccountTreeController } = Engine.context;
  const accounts = AccountTreeController.getAccountsFromSelectedAccountGroup();
  const evmAccount = accounts.find((account) =>
    account.type.startsWith('eip155:'),
  );

  return evmAccount || null;
};
