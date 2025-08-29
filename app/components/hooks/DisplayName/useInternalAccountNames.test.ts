import { renderHookWithProvider } from '../../../util/test/renderWithProvider';
import { MOCK_KEYRING_CONTROLLER } from '../../../selectors/keyringController/testUtils';
import { NETWORKS_CHAIN_ID } from '../../../constants/network';
import { NameType } from '../../UI/Name/Name.types';

import { useInternalAccountNames } from './useInternalAccountNames';

const UNKNOWN_ADDRESS_MOCK = '0xabc123';
const KNOWN_ACCOUNT_NAME = 'Account 1';
const KNOWN_ACCOUNT_ADDRESS = '0x0000000000000000000000000000000000000000';

const STATE_MOCK = {
  engine: {
    backgroundState: {
      AccountsController: {
        internalAccounts: {
          accounts: {
            [KNOWN_ACCOUNT_ADDRESS]: {
              address: KNOWN_ACCOUNT_ADDRESS,
              metadata: {
                name: KNOWN_ACCOUNT_NAME,
              },
            },
          },
          selectedAccount: KNOWN_ACCOUNT_ADDRESS,
        },
      },
      KeyringController: MOCK_KEYRING_CONTROLLER,
    },
  },
};

describe('useInternalAccountNames', () => {
  it('returns undefined if no account matched', () => {
    const {
      result: { current },
    } = renderHookWithProvider(
      () =>
        useInternalAccountNames([
          {
            type: NameType.EthereumAddress,
            value: UNKNOWN_ADDRESS_MOCK,
            variation: NETWORKS_CHAIN_ID.MAINNET,
          },
        ]),
      { state: STATE_MOCK },
    );

    expect(current[0]).toBe(undefined);
  });

  it('returns account name if account matched', () => {
    const {
      result: { current },
    } = renderHookWithProvider(
      () =>
        useInternalAccountNames([
          {
            type: NameType.EthereumAddress,
            value: KNOWN_ACCOUNT_ADDRESS,
            variation: NETWORKS_CHAIN_ID.MAINNET,
          },
        ]),
      { state: STATE_MOCK },
    );

    expect(current[0]).toBe(KNOWN_ACCOUNT_NAME);
  });
});
