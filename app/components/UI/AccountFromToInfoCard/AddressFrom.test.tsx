import React from 'react';
import { CHAIN_IDS } from '@metamask/transaction-controller';

import renderWithProvider, {
  DeepPartial,
} from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import { createMockAccountsControllerState } from '../../../util/test/accountsControllerTestUtils';
import { RootState } from '../../../reducers';
import { strings } from '../../../../locales/i18n';
import useNetworkInfo from '../../Views/confirmations/hooks/useNetworkInfo';
import AddressFrom from './AddressFrom';

const MOCK_ADDRESS = '0xe64dD0AB5ad7e8C5F2bf6Ce75C34e187af8b920A';
const MOCK_NETWORK_NAME = 'Ethereum Mainnet';
const MOCK_NETWORK_IMAGE = { uri: 'https://example.com/eth.png' };

const MOCK_ACCOUNTS_CONTROLLER_STATE = createMockAccountsControllerState([
  MOCK_ADDRESS,
]);

const mockInitialState: DeepPartial<RootState> = {
  settings: {},
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountTrackerController: {
        accountsByChainId: {
          [CHAIN_IDS.MAINNET]: {
            [MOCK_ADDRESS]: {
              balance: '200',
            },
          },
        },
      },
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
    },
  },
};

jest.mock('../../hooks/useAddressBalance/useAddressBalance', () => ({
  __esModule: true,
  default: () => ({ addressBalance: '1 ETH' }),
}));

jest.mock('../../Views/confirmations/hooks/useNetworkInfo');

jest.mock('../../../util/address', () => ({
  ...jest.requireActual('../../../util/address'),
  getLabelTextByAddress: () => undefined,
  renderAccountName: () => 'Account 1',
  toChecksumAddress: (address: string) => address,
}));

jest.mock('../../../core/Engine', () => {
  const { MOCK_ACCOUNTS_CONTROLLER_STATE: mockAccountsControllerState } =
    jest.requireActual('../../../util/test/accountsControllerTestUtils');

  return {
    context: {
      AccountsController: {
        ...mockAccountsControllerState,
        state: mockAccountsControllerState,
      },
      KeyringController: {
        state: { keyrings: [] },
      },
    },
  };
});

const renderAddressFrom = () =>
  renderWithProvider(
    <AddressFrom
      asset={{
        address: MOCK_ADDRESS,
        symbol: 'ETH',
        decimals: 18,
        isETH: true,
      }}
      from={MOCK_ADDRESS}
      chainId={CHAIN_IDS.MAINNET}
    />,
    { state: mockInitialState },
  );

describe('AddressFrom', () => {
  const useNetworkInfoMock = jest.mocked(useNetworkInfo);

  beforeEach(() => {
    useNetworkInfoMock.mockReturnValue({
      networkName: MOCK_NETWORK_NAME,
      networkImage: MOCK_NETWORK_IMAGE,
      networkNativeCurrency: 'ETH',
    });
  });

  it('renders from label', () => {
    const { getByText } = renderAddressFrom();

    expect(getByText(strings('transaction.fromWithColon'))).toBeOnTheScreen();
  });

  it('renders account balance', () => {
    const { getByTestId } = renderAddressFrom();

    expect(getByTestId('account-balance')).toBeOnTheScreen();
  });

  it('renders network badge when network image is provided', () => {
    const { getByTestId, getByText } = renderAddressFrom();

    expect(getByTestId('account-base-network-badge')).toBeOnTheScreen();
    expect(getByText(MOCK_NETWORK_NAME)).toBeOnTheScreen();
  });

  it('hides network badge when network image is missing', () => {
    useNetworkInfoMock.mockReturnValue({
      networkName: MOCK_NETWORK_NAME,
      networkImage: undefined,
      networkNativeCurrency: 'ETH',
    } as ReturnType<typeof useNetworkInfo>);

    const { queryByTestId, getByText } = renderAddressFrom();

    expect(getByText(MOCK_NETWORK_NAME)).toBeOnTheScreen();
    expect(queryByTestId('account-base-network-badge')).not.toBeOnTheScreen();
  });
});
