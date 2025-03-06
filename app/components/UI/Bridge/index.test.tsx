import React from 'react';
import renderWithProvider, { DeepPartial } from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import { RootState } from '../../../reducers';
import BridgeView from '../Bridge';
import { fireEvent } from '@testing-library/react-native';
import Routes from '../../../constants/navigation/Routes';

jest.mock('../../../core/Engine', () => ({
  context: {
    SwapsController: {
      fetchAggregatorMetadataWithCache: jest.fn(),
      fetchTopAssetsWithCache: jest.fn(),
      fetchTokenWithCache: jest.fn(),
    },
  },
}));

const mockInitialState: DeepPartial<RootState> = {
  engine: {
    backgroundState: {
      ...backgroundState,
    },
  },
};

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

// Mock useLatestBalance hook
jest.mock('./useLatestBalance', () => ({
  useLatestBalance: jest.fn().mockImplementation((token, chainId) => {
    if (!token.address || !chainId) return undefined;

    // Need to do this due to this error: "The module factory of `jest.mock()` is not allowed to reference any out-of-scope variables.""
    const actualEthers = jest.requireActual('ethers');

    return {
      displayBalance: '2.0',
      atomicBalance: actualEthers.BigNumber.from('2000000000000000000'), // 2 ETH
    };
  }),
}));

describe('BridgeView', () => {
  const initialState = {
    engine: {
      backgroundState: {
        NetworkController: {
          selectedNetworkClientId: '1',
          networkConfigurations: {
            '0x1': {
              chainId: '0x1',
              ticker: 'ETH',
              nickname: 'Ethereum Mainnet',
            },
          },
          providerConfig: {
            chainId: '0x1',
          },
        },
        MultichainNetworkController: {
          isEvmSelected: true,
          selectedMultichainNetworkChainId: undefined,
          multichainNetworkConfigurationsByChainId: {},
        },
        AccountTrackerController: {
          accounts: {
            '0x1234567890123456789012345678901234567890': {
              balance: '0x0',
            },
          },
        },
        AccountsController: {
          internalAccounts: {
            selectedAccount: 'account1',
            accounts: {
              account1: {
                id: 'account1',
                address: '0x1234567890123456789012345678901234567890',
                name: 'Account 1',
                balance: '0x0',
              },
            },
          },
        },
        CurrencyRateController: {
          currentCurrency: 'USD',
          conversionRate: 2000,
        },
        PreferencesController: {
          ipfsGateway: 'https://dweb.link/ipfs/',
        },
      },
    },
    bridge: {
      sourceToken: {
        symbol: 'ETH',
        decimals: 18,
        address: '0x0000000000000000000000000000000000000000',
      },
      destToken: undefined,
      sourceAmount: '',
      destAmount: '',
      sourceChainId: '0x1' as const,
      destChainId: undefined,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders', async () => {
    const { getByText } = renderWithProvider(<BridgeView />, {
      state: mockInitialState,
    });
    expect(getByText('Select amount')).toBeDefined();
  });

  it('should open BridgeTokenSelector when clicking source token', async () => {
    const { findByText } = renderWithProvider(
      <BridgeView />,
      { state: initialState },
    );

    // Find and click the token button
    const tokenButton = await findByText('ETH');
    expect(tokenButton).toBeTruthy();
    fireEvent.press(tokenButton);

    // Verify navigation to BridgeTokenSelector
    expect(mockNavigate).toHaveBeenCalledWith(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.BRIDGE_TOKEN_SELECTOR,
      params: {},
    });
  });

  it('should open BridgeTokenSelector when clicking destination token area', async () => {
    const { getByTestId } = renderWithProvider(
      <BridgeView />,
      { state: initialState },
    );

    // Find and click the destination token area
    const destTokenArea = getByTestId('dest-token-area');
    expect(destTokenArea).toBeTruthy();

    fireEvent.press(destTokenArea);

    // Verify navigation to BridgeTokenSelector
    expect(mockNavigate).toHaveBeenCalledWith(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.BRIDGE_TOKEN_SELECTOR,
      params: {},
    });
  });

  it('should display source token symbol and balance', () => {
    const stateWithAmount = {
      ...initialState,
      bridge: {
        ...initialState.bridge,
        sourceAmount: '1.5',
      },
    };

    const { getByText } = renderWithProvider(
      <BridgeView />,
      { state: stateWithAmount },
    );

    // Verify token symbol is displayed
    expect(getByText('ETH')).toBeTruthy();

    // Verify token amount is displayed
    expect(getByText('1.5')).toBeTruthy();

    // Verify fiat value is displayed (1.5 ETH * $2000 = $3000)
    expect(getByText('$3000')).toBeTruthy();
  });

  describe('Bottom Content', () => {
    it('should show "Select amount" when no amount is entered', () => {
      const { getByText } = renderWithProvider(
        <BridgeView />,
        { state: initialState },
      );

      expect(getByText('Select amount')).toBeTruthy();
    });

    it('should show "Select amount" when amount is zero', () => {
      const stateWithZeroAmount = {
        ...initialState,
        bridge: {
          ...initialState.bridge,
          sourceAmount: '0',
        },
      };

      const { getByText } = renderWithProvider(
        <BridgeView />,
        { state: stateWithZeroAmount },
      );

      expect(getByText('Select amount')).toBeTruthy();
    });

    it('should show "Insufficient balance" when amount exceeds balance', () => {
      const stateWithHighAmount = {
        ...initialState,
        bridge: {
          ...initialState.bridge,
          sourceAmount: '3.0', // Balance is mocked at 2.0 ETH
        },
      };

      const { getByText } = renderWithProvider(
        <BridgeView />,
        { state: stateWithHighAmount },
      );

      expect(getByText('Insufficient balance')).toBeTruthy();
    });

    it('should show Continue button and Terms link when amount is valid', () => {
      const stateWithValidAmount = {
        ...initialState,
        bridge: {
          ...initialState.bridge,
          sourceAmount: '1.0', // Less than balance of 2.0 ETH
        },
      };

      const { getByText } = renderWithProvider(
        <BridgeView />,
        { state: stateWithValidAmount },
      );

      expect(getByText('Continue')).toBeTruthy();
      expect(getByText('Terms & Conditions')).toBeTruthy();
    });

    it('should handle Continue button press', () => {
      const stateWithValidAmount = {
        ...initialState,
        bridge: {
          ...initialState.bridge,
          sourceAmount: '1.0',
        },
      };

      const { getByText } = renderWithProvider(
        <BridgeView />,
        { state: stateWithValidAmount },
      );

      const continueButton = getByText('Continue');
      fireEvent.press(continueButton);

      expect(mockNavigate).toHaveBeenCalledWith(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.SHEET.BRIDGE_TOKEN_SELECTOR,
      });
    });

    it('should handle Terms & Conditions press', () => {
      const stateWithValidAmount = {
        ...initialState,
        bridge: {
          ...initialState.bridge,
          sourceAmount: '1.0',
        },
      };

      const { getByText } = renderWithProvider(
        <BridgeView />,
        { state: stateWithValidAmount },
      );

      const termsButton = getByText('Terms & Conditions');
      fireEvent.press(termsButton);

      // TODO: Add expectations once Terms navigation is implemented
    });
  });
});
