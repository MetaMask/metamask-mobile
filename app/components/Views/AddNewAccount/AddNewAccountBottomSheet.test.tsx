import React from 'react';
import AddNewAccountBottomSheet from './AddNewAccountBottomSheet';
import { WalletClientType } from '../../../core/SnapKeyring/MultichainWalletSnapClient';
import { SolScope } from '@metamask/keyring-api';
import { renderScreen } from '../../../util/test/renderWithProvider';
import { CaipChainId } from '@metamask/utils';
import { RootState } from '../../../reducers';
import { backgroundState } from '../../../util/test/initial-root-state';
import { KeyringTypes } from '@metamask/keyring-controller';
import {
  internalAccount1,
  internalAccount2,
  MOCK_ACCOUNTS_CONTROLLER_STATE,
} from '../../../util/test/accountsControllerTestUtils';
import Engine from '../../../core/Engine/Engine';

const mockKeyring1 = {
  type: KeyringTypes.hd,
  accounts: [internalAccount1.address],
  metadata: {
    id: '01JKZ55Y6KPCYH08M6B9VSZWKW',
    name: '',
  },
};

const mockKeyring2 = {
  type: KeyringTypes.hd,
  accounts: [internalAccount2.address],
  metadata: {
    id: '01JKZ56KRVYEEHC601HSNW28T2',
    name: '',
  },
};

const mockNextAccountName = 'Account 3';

const initialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
      KeyringController: {
        keyrings: [mockKeyring1, mockKeyring2],
      },
    },
  },
} as unknown as RootState;

const mockGetNextAvailableAccountName = jest
  .fn()
  .mockImplementation((keyringType: KeyringTypes) => {
    switch (keyringType) {
      case KeyringTypes.snap:
        return 'Snap Account 1';
      case KeyringTypes.hd:
        return mockNextAccountName;
      default:
        return mockNextAccountName;
    }
  });

jest.mock('../../../core/Engine', () => {
  const { MOCK_ACCOUNTS_CONTROLLER_STATE: mockAccountsControllerState } =
    jest.requireActual('../../../util/test/accountsControllerTestUtils');
  return {
    context: {
      AccountsController: {
        state: mockAccountsControllerState,
        getNextAvailableAccountName: (keyringType: KeyringTypes) =>
          mockGetNextAvailableAccountName(keyringType),
      },
    },
  };
});

jest.mocked(Engine);

const render = (route: {
  params: {
    scope: CaipChainId;
    clientType: WalletClientType;
  };
}) =>
  renderScreen(
    () => <AddNewAccountBottomSheet route={route} />,
    {
      name: 'AddNewAccountBottomSheet',
    },
    { state: initialState },
  );

describe('AddNewAccountBottomSheet', () => {
  it('renders correctly with default props', () => {
    const route = { params: undefined };
    // @ts-expect-error - params not defined for evm
    const { toJSON } = render(route);

    expect(toJSON()).toBeTruthy();
  });

  it('renders correctly with provided scope and clientType', () => {
    const route = {
      params: {
        scope: SolScope.Mainnet,
        clientType: WalletClientType.Solana,
      },
    };
    const { toJSON } = render(route);

    expect(toJSON()).toBeTruthy();
  });
});
