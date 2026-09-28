import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { fireEvent } from '@testing-library/react-native';

import AddressElement from '.';
import { renderShortAddress } from '../../../../../../util/address';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import { mockNetworkState } from '../../../../../../util/test/network';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { strings } from '../../../../../../../locales/i18n';
import { RootState } from '../../../../../../reducers';
import { EngineState } from '../../../../../../core/Engine';

jest.unmock('react-redux');
jest.mock('../../../../../../util/ENSUtils', () => ({
  getCachedENSName: jest.fn().mockReturnValue(undefined),
  doENSReverseLookup: jest.fn().mockResolvedValue(undefined),
  ENSCache: { cache: {} },
}));

const mockedNetworkControllerState = mockNetworkState({
  chainId: CHAIN_IDS.MAINNET,
  id: 'mainnet',
  nickname: 'Ethereum Mainnet',
  ticker: 'ETH',
});

jest.mock('../../../../../../core/Engine', () => {
  const { MOCK_ACCOUNTS_CONTROLLER_STATE } = jest.requireActual(
    '../../../../../../util/test/accountsControllerTestUtils',
  );
  return {
    context: {
      NetworkController: {
        getProviderAndBlockTracker: jest.fn().mockImplementation(() => ({
          provider: {
            sendAsync: () => null,
          },
        })),
        getNetworkClientById: () => ({
          configuration: {
            chainId: '0x1',
          },
        }),
        state: {
          ...mockedNetworkControllerState,
        },
      },
      KeyringController: {
        state: {
          keyrings: [],
        },
      },
      AccountsController: {
        ...MOCK_ACCOUNTS_CONTROLLER_STATE,
        state: MOCK_ACCOUNTS_CONTROLLER_STATE,
      },
    },
  };
});

const initialState = {
  engine: {
    backgroundState,
  },
};

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const renderComponent = (
  state: Partial<RootState> & { engine: { backgroundState: EngineState } },
  options?: {
    displayNetworkBadge?: boolean;
    chainId?: Hex;
    isAmbiguousAddress?: boolean;
    name?: string;
    onAccountLongPress?: () => void;
    onAccountPress?: () => void;
    onIconPress?: () => void;
  },
) =>
  renderWithProvider(
    <AddressElement
      address={'0xd018538C87232FF95acbCe4870629b75640a78E7'}
      name={options?.name}
      onAccountPress={options?.onAccountPress ?? (() => null)}
      onAccountLongPress={options?.onAccountLongPress ?? (() => null)}
      onIconPress={options?.onIconPress ?? (() => null)}
      testID="address-element"
      chainId={options?.chainId ?? '0x1'}
      displayNetworkBadge={options?.displayNetworkBadge}
      isAmbiguousAddress={options?.isAmbiguousAddress}
    />,
    { state },
  );

describe('AddressElement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  it('should render correctly', () => {
    const { getByTestId } = renderComponent(initialState);
    expect(getByTestId('address-element')).toBeOnTheScreen();
  });

  it('should render the address', () => {
    const address = '0xd018538C87232FF95acbCe4870629b75640a78E7';
    const { getByText } = renderComponent(initialState);
    const addressText = getByText(renderShortAddress(address));
    expect(addressText).toBeDefined();
  });

  it('renders the name and address when a name is provided', () => {
    const address = '0xd018538C87232FF95acbCe4870629b75640a78E7';
    const { getByText } = renderComponent(initialState, {
      name: 'Primary account',
    });

    expect(getByText('Primary account')).toBeOnTheScreen();
    expect(getByText(renderShortAddress(address))).toBeOnTheScreen();
  });

  it('calls the account callbacks when the item is pressed', () => {
    const onAccountPress = jest.fn();
    const onAccountLongPress = jest.fn();
    const { getByTestId } = renderComponent(initialState, {
      onAccountPress,
      onAccountLongPress,
    });

    fireEvent.press(getByTestId('address-element'));
    fireEvent(getByTestId('address-element'), 'longPress');

    expect(onAccountPress).toHaveBeenCalledWith(
      '0xd018538C87232FF95acbCe4870629b75640a78E7',
    );
    expect(onAccountLongPress).toHaveBeenCalledWith(
      '0xd018538C87232FF95acbCe4870629b75640a78E7',
    );
  });

  it('renders and handles the ambiguous address warning', () => {
    const onIconPress = jest.fn();
    const { getByLabelText } = renderComponent(initialState, {
      isAmbiguousAddress: true,
      onIconPress,
    });

    fireEvent.press(
      getByLabelText(strings('duplicate_address.accessibility_label')),
    );

    expect(onIconPress).toHaveBeenCalledTimes(1);
  });

  it('renders the network badge when displayNetworkBadge is true', () => {
    const { getByTestId } = renderComponent(
      {
        ...initialState,
        engine: {
          backgroundState: {
            ...backgroundState,
            NetworkController: {
              ...backgroundState.NetworkController,
              networkConfigurationsByChainId: {
                '0x1': {
                  name: 'Ethereum Mainnet',
                  chainId: '0x1',
                  blockExplorerUrls: [],
                  rpcEndpoints: [],
                  defaultRpcEndpointIndex: 0,
                  nativeCurrency: 'ETH',
                },
              },
            },
          },
        },
      },
      {
        displayNetworkBadge: true,
      },
    );

    expect(getByTestId('address-element-network-badge')).toBeOnTheScreen();
  });

  it('does not render network badge when network image source is missing', () => {
    const { getByTestId, queryByTestId } = renderComponent(initialState, {
      displayNetworkBadge: true,
      chainId: '0xdeadbeef',
    });

    expect(getByTestId('address-element')).toBeOnTheScreen();
    expect(
      queryByTestId('address-element-network-badge'),
    ).not.toBeOnTheScreen();
  });
});
