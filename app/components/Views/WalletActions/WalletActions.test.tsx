import React from 'react';
import { fireEvent } from '@testing-library/react-native';

import renderWithProvider from '../../../util/test/renderWithProvider';

import WalletActions from './WalletActions';
import {
  WALLET_BUY,
  WALLET_RECEIVE,
  WALLET_SEND,
  WALLET_SWAP,
} from './WalletActions.constants';
import Engine from '../../../core/Engine';

const mockEngine = Engine;

const mockInitialState = {
  swaps: { '1': { isLive: true }, hasOnboarded: false, isLive: true },
  fiatOrders: {
    networks: [
      {
        active: true,
        chainId: 1,
        chainName: 'Ethereum Mainnet',
        nativeTokenSupported: true,
      },
    ],
  },
  engine: {
    backgroundState: {
      PreferencesController: {},
      NetworkController: {
        providerConfig: { type: 'mainnet', chainId: '1', ticker: 'ETH' },
      },
    },
  },
};

jest.mock('../../../core/Engine', () => ({
  init: () => mockEngine.init({}),
}));

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
    }),
  };
});

jest.mock('react-native-safe-area-context', () => {
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  const frame = { width: 0, height: 0, x: 0, y: 0 };
  return {
    SafeAreaProvider: jest.fn().mockImplementation(({ children }) => children),
    SafeAreaConsumer: jest
      .fn()
      .mockImplementation(({ children }) => children(inset)),
    useSafeAreaInsets: jest.fn().mockImplementation(() => inset),
    useSafeAreaFrame: jest.fn().mockImplementation(() => frame),
  };
});

describe('WalletActions', () => {
  afterEach(() => {
    mockNavigate.mockClear();
  });
  it('should renderWithProvider correctly', () => {
    jest.mock('react-redux', () => ({
      ...jest.requireActual('react-redux'),
      useSelector: jest
        .fn()
        .mockImplementation((callback) => callback(mockInitialState)),
    }));
    const { getByTestId } = renderWithProvider(<WalletActions />, {
      state: mockInitialState,
    });

    expect(getByTestId(WALLET_BUY)).toBeDefined();
    expect(getByTestId(WALLET_SEND)).toBeDefined();
    expect(getByTestId(WALLET_RECEIVE)).toBeDefined();
    expect(getByTestId(WALLET_SWAP)).toBeDefined();
  });

  it('should not show the buy button and swap button if the chain does not allow buying', () => {
    const state = {
      swaps: { '1': { isLive: false }, hasOnboarded: false, isLive: true },
      fiatOrders: {
        networks: [
          {
            active: true,
            chainId: 1,
            chainName: 'Ethereum Mainnet',
            nativeTokenSupported: true,
          },
        ],
      },
      engine: {
        backgroundState: {
          PreferencesController: {},
          NetworkController: {
            providerConfig: {
              type: 'mainnet',
              chainId: '0',
              ticker: 'eth',
            },
          },
        },
      },
    };

    jest.mock('react-redux', () => ({
      ...jest.requireActual('react-redux'),
      useSelector: jest.fn().mockImplementation((callback) => callback(state)),
    }));

    const { queryByTestId } = renderWithProvider(<WalletActions />, {
      state,
    });

    expect(queryByTestId(WALLET_BUY)).toBeNull();
    expect(queryByTestId(WALLET_SWAP)).toBeNull();
  });

  it('should call the onBuy function when the Buy button is pressed', () => {
    const { getByTestId } = renderWithProvider(<WalletActions />, {
      state: mockInitialState,
    });

    fireEvent.press(getByTestId(WALLET_BUY));
    expect(mockNavigate).toHaveBeenCalled();
  });

  it('should call the onSend function when the Send button is pressed', () => {
    const { getByTestId } = renderWithProvider(<WalletActions />);

    fireEvent.press(getByTestId(WALLET_SEND));

    expect(mockNavigate).toHaveBeenCalled();
  });
  it('should call the goToSwaps function when the Send button is pressed', () => {
    const { getByTestId } = renderWithProvider(<WalletActions />, {
      state: mockInitialState,
    });

    fireEvent.press(getByTestId(WALLET_SWAP));

    expect(mockNavigate).toHaveBeenCalled();
  });
});
