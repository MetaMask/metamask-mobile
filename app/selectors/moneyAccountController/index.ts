import { createSelector } from 'reselect';
import type {
  MoneyAccount,
  MoneyAccountControllerState,
} from '@metamask/money-account-controller';
import { MONEY_DERIVATION_PATH } from '@metamask/eth-money-keyring';
import { RootState } from '../../reducers';
import { selectPrimaryHDKeyring } from '../keyringController';

// TEMP: remove before merging — hardcoded primary money account for local dev
const TEMP_FAKE_PRIMARY_MONEY_ACCOUNT: MoneyAccount = {
  id: 'temp-fake-account',
  address: '0x2372881cffb7adc1bfc8963e61c9e86f022ac3ba',
  type: 'eip155:eoa',
  scopes: [],
  methods: [],
  options: {
    entropy: {
      type: 'mnemonic',
      id: 'temp-fake-keyring-id',
      derivationPath: `${MONEY_DERIVATION_PATH}/0`,
      groupIndex: 0,
    },
    exportable: false,
  },
};

/**
 * Selects the MoneyAccountController state from the root Redux state.
 *
 * @param state - The root Redux state.
 * @returns The MoneyAccountController state.
 */
const selectMoneyAccountControllerState = (state: RootState) =>
  state.engine.backgroundState.MoneyAccountController;

/**
 * Selects the Money accounts record.
 *
 * @param state - The root Redux state.
 * @returns The Money accounts record.
 */
export const selectMoneyAccounts = createSelector(
  selectMoneyAccountControllerState,
  (state: MoneyAccountControllerState) => state.moneyAccounts,
);

/**
 * Selects the primary Money account.
 *
 * @param state - The root Redux state.
 * @returns The primary Money account.
 */
export const selectPrimaryMoneyAccount = createSelector(
  selectMoneyAccounts,
  selectPrimaryHDKeyring,
  () => TEMP_FAKE_PRIMARY_MONEY_ACCOUNT,
);
