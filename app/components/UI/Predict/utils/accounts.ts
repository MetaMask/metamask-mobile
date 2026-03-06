/**
 * Account utilities for Perps components
 * Handles account selection and EVM account filtering
 */
import { isEvmAccountType } from '@metamask/keyring-api';
import Engine from '../../../../core/Engine';

/**
 * Finds the key in a map whose address matches the given address case-insensitively.
 * Polymarket and EVM tooling can return addresses in checksummed or lowercase form,
 * so direct key lookups may miss a valid entry.
 *
 * @param map - Object keyed by Ethereum addresses
 * @param address - Address to match (any casing)
 * @returns The matching key as stored in the map, or undefined if not found
 */
export const findAddressKey = (
  map: Record<string, unknown>,
  address: string,
): string | undefined => {
  const normalized = address.toLowerCase();
  return Object.keys(map).find((key) => key.toLowerCase() === normalized);
};

/**
 * Gets the EVM account from the selected account group
 * Extracts the duplicated pattern used throughout PerpsController
 *
 * @returns EVM account or null if not found
 */
export const getEvmAccountFromSelectedAccountGroup = () => {
  const accounts =
    Engine.context?.AccountTreeController?.getAccountsFromSelectedAccountGroup?.() ??
    [];
  const evmAccount = accounts.find(
    (account) => account && isEvmAccountType(account.type),
  );

  return evmAccount || null;
};
