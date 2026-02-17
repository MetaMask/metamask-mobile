import React from 'react';
import ConfirmAddAsset from './ConfirmAddAsset';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import renderWithProvider, {
  DeepPartial,
} from '../../../../../util/test/renderWithProvider';
import { userEvent } from '@testing-library/react-native';
import { RootState } from '../../../../../reducers';
import { mockNetworkState } from '../../../../../util/test/network';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { useParams } from '../../../../../util/navigation/navUtils';
import {
  TESTID_BOTTOMSHEETFOOTER_BUTTON,
  TESTID_BOTTOMSHEETFOOTER_BUTTON_SUBSEQUENT,
} from '../../../../../component-library/components/BottomSheets/BottomSheetFooter/BottomSheetFooter.constants';
import Routes from '../../../../../constants/navigation/Routes';

const mockSetOptions = jest.fn();
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockAddTokenList = jest.fn().mockResolvedValue(undefined);

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
      setOptions: mockSetOptions,
      goBack: mockGoBack,
    }),
  };
});

jest.mock('../../../../../util/navigation/navUtils', () => ({
  useParams: jest.fn(),
  useRoute: jest.fn(),
  createNavigationDetails: jest.fn(),
}));

const DEFAULT_ASSET = {
  address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
  symbol: 'USDT',
  name: 'Tether USD',
  image: 'https://example.com/usdt.png',
  decimals: 18,
  chainId: '0x1',
};

const mockInitialState: DeepPartial<RootState> = {
  settings: {},
  engine: {
    backgroundState: {
      ...backgroundState,
      NetworkController: {
        ...mockNetworkState({
          chainId: CHAIN_IDS.MAINNET,
          id: 'mainnet',
          nickname: 'Mainnet',
          ticker: 'ETH',
        }),
      },
    },
  },
};

const setupParams = (
  overrides: Partial<{
    selectedAsset: Record<string, unknown>[];
    networkName: string;
    addTokenList: jest.Mock;
  }> = {},
) => {
  (useParams as jest.Mock).mockReturnValue({
    selectedAsset: [DEFAULT_ASSET],
    networkName: 'Ethereum Main Network',
    addTokenList: mockAddTokenList,
    ...overrides,
  });
};

describe('ConfirmAddAsset', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupParams();
  });

  it('displays asset name and symbol', () => {
    const { getByText } = renderWithProvider(<ConfirmAddAsset />, {
      state: mockInitialState,
    });

    expect(getByText('Tether USD')).toBeOnTheScreen();
    expect(getByText('USDT')).toBeOnTheScreen();
  });

  it('renders multiple assets', () => {
    const secondAsset = {
      address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      symbol: 'USDC',
      name: 'USD Coin',
      image: 'https://example.com/usdc.png',
      decimals: 6,
      chainId: '0x1',
    };

    setupParams({ selectedAsset: [DEFAULT_ASSET, secondAsset] });

    const { getByText } = renderWithProvider(<ConfirmAddAsset />, {
      state: mockInitialState,
    });

    expect(getByText('Tether USD')).toBeOnTheScreen();
    expect(getByText('USDT')).toBeOnTheScreen();
    expect(getByText('USD Coin')).toBeOnTheScreen();
    expect(getByText('USDC')).toBeOnTheScreen();
  });

  it('calls goBack when back button is pressed', async () => {
    const { getByTestId } = renderWithProvider(<ConfirmAddAsset />, {
      state: mockInitialState,
    });

    const backButton = getByTestId(TESTID_BOTTOMSHEETFOOTER_BUTTON);
    await userEvent.press(backButton);

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('calls addTokenList and navigates to wallet when import button is pressed', async () => {
    const { getByTestId } = renderWithProvider(<ConfirmAddAsset />, {
      state: mockInitialState,
    });

    const importButton = getByTestId(
      TESTID_BOTTOMSHEETFOOTER_BUTTON_SUBSEQUENT,
    );
    await userEvent.press(importButton);

    expect(mockAddTokenList).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.HOME, {
      screen: Routes.WALLET.TAB_STACK_FLOW,
      params: {
        screen: Routes.WALLET_VIEW,
      },
    });
  });

  it('renders without crashing when asset has no image', () => {
    const assetWithoutImage = {
      address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
      symbol: 'USDT',
      name: 'Tether USD',
      decimals: 18,
      chainId: '0x1',
    };

    setupParams({ selectedAsset: [assetWithoutImage] });

    const { getByText } = renderWithProvider(<ConfirmAddAsset />, {
      state: mockInitialState,
    });

    expect(getByText('Tether USD')).toBeOnTheScreen();
    expect(getByText('USDT')).toBeOnTheScreen();
  });

  it('sets navigation bar options on mount', () => {
    renderWithProvider(<ConfirmAddAsset />, {
      state: mockInitialState,
    });

    expect(mockSetOptions).toHaveBeenCalledTimes(1);
  });
});
