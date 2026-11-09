import ExtendedKeyringTypes, {
  MFA_MONEY_KEYRING_TYPES,
  MONEY_KEYRING_TYPES,
} from '../../constants/keyringTypes';
import {
  KeyringControllerState,
  KeyringObject,
} from '@metamask/keyring-controller';
import { RootState } from '../../reducers';
import { createDeepEqualSelector } from '../util';

/**
 * Selects the KeyringController state from the root Redux state.
 * @param state - Root Redux state
 * @returns - KeyringController state
 */
const selectKeyringControllerState = (state: RootState) =>
  state.engine.backgroundState.KeyringController;

/**
 * A memoized selector that retrieves keyrings from the KeyringController
 */
export const selectKeyrings = createDeepEqualSelector(
  selectKeyringControllerState,
  (keyringControllerState: KeyringControllerState) =>
    keyringControllerState.keyrings,
);

/**
 * Selects all HD keyrings from the state
 * @param state - The Redux state
 * @returns Array of HD keyrings
 */
export const selectHDKeyrings = createDeepEqualSelector(
  selectKeyrings,
  (keyrings) => keyrings.filter((kr) => kr.type === ExtendedKeyringTypes.hd),
);

/**
 * Selects the primary (first) HD keyring from the state
 * @param state - The Redux state
 * @returns The primary HD keyring, or undefined if none exist
 */
export const selectPrimaryHDKeyring = createDeepEqualSelector(
  selectHDKeyrings,
  (keyrings): KeyringObject | undefined => keyrings[0],
);

/**
 * Checks if there are multiple HD keyrings in the state
 * @param state - The Redux state
 * @returns True if there is more than one HD keyring
 */
export const hasMultipleHDKeyrings = createDeepEqualSelector(
  selectKeyrings,
  (keyrings) =>
    keyrings.filter((kr) => kr.type === ExtendedKeyringTypes.hd).length > 1,
);

/**
 * A memoized selector that returns the lowercased addresses of every account
 * held by a Money keyring.
 *
 * Money Accounts are not internal accounts, so `metadata.keyring` lookups on
 * `AccountsController` do not apply; the keyring list is the source of truth.
 */
export const selectMoneyKeyringAddresses = createDeepEqualSelector(
  selectKeyrings,
  (keyrings): string[] =>
    keyrings
      .filter((keyring) => MONEY_KEYRING_TYPES.includes(keyring.type))
      .flatMap((keyring) =>
        keyring.accounts.map((account) => account.toLowerCase()),
      ),
);

/**
 * Whether the given address belongs to a Money keyring.
 *
 * Money keyrings cannot sign transactions, so their transactions must stay
 * externally signed and publish through the EIP-7702 sponsored relay.
 *
 * @param state - The Redux state.
 * @param address - The account address to check.
 * @returns True when the address is held by a Money keyring.
 */
export const selectIsMoneyKeyringAddress = (
  state: RootState,
  address: string | undefined,
): boolean =>
  address !== undefined &&
  selectMoneyKeyringAddresses(state).includes(address.toLowerCase());

/**
 * A memoized selector that returns the lowercased addresses of every account
 * held by a Money keyring that requires MFA to sign.
 *
 * Like `selectMoneyKeyringAddresses`, the keyring list is the source of truth:
 * Money Accounts are not internal accounts.
 */
export const selectMfaMoneyKeyringAddresses = createDeepEqualSelector(
  selectKeyrings,
  (keyrings): string[] =>
    keyrings
      .filter((keyring) => MFA_MONEY_KEYRING_TYPES.includes(keyring.type))
      .flatMap((keyring) =>
        keyring.accounts.map((account) => account.toLowerCase()),
      ),
);

/**
 * Dev-only override that treats every Money keyring as MFA.
 *
 * An MFA Money Account cannot be the primary account at runtime yet
 * (`selectPrimaryMoneyAccount` filters to mnemonic-backed accounts), so the
 * MFA deposit path is otherwise unreachable on device. This lets an ordinary
 * SFA Money Account exercise it end to end.
 *
 * Fenced behind `__DEV__` so a stray env var can never force the non-atomic
 * path in a release build, matching `isMoneyAccountEnabled`'s agentic flag.
 *
 * @returns Whether the override is active.
 */
export function isForceNonAtomicMoneyDepositEnabled(): boolean {
  return __DEV__ && process.env.MM_MONEY_FORCE_NON_ATOMIC_DEPOSIT === 'true';
}

/**
 * Whether the given address belongs to a Money keyring that requires MFA to
 * sign.
 *
 * Each signature from such a keyring costs the user an MFA confirmation, so
 * deposits from these accounts take the non-atomic path to avoid signing a
 * fresh delegation for every quote.
 *
 * Under the dev-only `MM_MONEY_FORCE_NON_ATOMIC_DEPOSIT` override, any Money
 * keyring address qualifies, so a local SFA account can exercise the path.
 *
 * @param state - The Redux state.
 * @param address - The account address to check.
 * @returns True when the address is held by an MFA Money keyring.
 */
export const selectIsMfaMoneyKeyringAddress = (
  state: RootState,
  address: string | undefined,
): boolean => {
  if (address === undefined) {
    return false;
  }

  if (isForceNonAtomicMoneyDepositEnabled()) {
    return selectIsMoneyKeyringAddress(state, address);
  }

  return selectMfaMoneyKeyringAddresses(state).includes(address.toLowerCase());
};

/**
 * A memoized selector that returns the list of accounts from all keyrings in the form of a flattened array of strings.
 */
export const selectFlattenedKeyringAccounts = createDeepEqualSelector(
  selectKeyrings,
  (keyrings: KeyringControllerState['keyrings']) => {
    const flattenedKeyringAccounts = keyrings.flatMap(
      (keyring) => keyring.accounts,
    );
    return flattenedKeyringAccounts;
  },
);

/**
 * A memoized selector that returns if the KeyringController is unlocked.
 */
export const selectIsUnlocked = createDeepEqualSelector(
  selectKeyringControllerState,
  (keyringControllerState: KeyringControllerState) =>
    keyringControllerState.isUnlocked,
);
