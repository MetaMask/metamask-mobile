import React from 'react';
import Share from 'react-native-share';

import { fireEvent } from '@testing-library/react-native';

import renderWithProvider from '../../../util/test/renderWithProvider';

import Engine from '../../../core/Engine';
import Routes from '../../../constants/navigation/Routes';
import AccountActions from './AccountActions';
import {
  EDIT_ACCOUNT,
  SHARE_ADDRESS,
  SHOW_PRIVATE_KEY,
  VIEW_ETHERSCAN,
} from './AccountActions.constants';
import { backgroundState } from '../../../util/test/initial-root-state';
import {
  MOCK_ACCOUNTS_CONTROLLER_STATE,
  MOCK_ADDRESS_2,
} from '../../../util/test/accountsControllerTestUtils';
import { toChecksumHexAddress } from '@metamask/controller-utils';

const mockEngine = Engine;

const initialState = {
  swaps: { '0x1': { isLive: true }, hasOnboarded: false, isLive: true },
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
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

jest.mock('react-native-share', () => ({
  open: jest.fn(() => Promise.resolve()),
}));

describe('AccountActions', () => {
  afterEach(() => {
    mockNavigate.mockClear();
  });
  it('renders all actions', () => {
    const { getByTestId } = renderWithProvider(<AccountActions />, {
      state: initialState,
    });

    expect(getByTestId(EDIT_ACCOUNT)).toBeDefined();
    expect(getByTestId(VIEW_ETHERSCAN)).toBeDefined();
    expect(getByTestId(SHARE_ADDRESS)).toBeDefined();
    expect(getByTestId(SHOW_PRIVATE_KEY)).toBeDefined();
  });

  it('navigates to webview when View on Etherscan is clicked', () => {
    const { getByTestId } = renderWithProvider(<AccountActions />, {
      state: initialState,
    });

    fireEvent.press(getByTestId(VIEW_ETHERSCAN));

    expect(mockNavigate).toHaveBeenCalledWith('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: 'https://etherscan.io/address/0xC4966c0D659D99699BFD7EB54D8fafEE40e4a756',
        title: 'etherscan.io',
      },
    });
  });

  it('opens the Share sheet when Share my public address is clicked', () => {
    const { getByTestId } = renderWithProvider(<AccountActions />, {
      state: initialState,
    });

    fireEvent.press(getByTestId(SHARE_ADDRESS));

    expect(Share.open).toHaveBeenCalledWith({
      message: toChecksumHexAddress(MOCK_ADDRESS_2),
    });
  });

  it('navigates to the export private key screen when Show private key is clicked', () => {
    const { getByTestId } = renderWithProvider(<AccountActions />, {
      state: initialState,
    });

    fireEvent.press(getByTestId(SHOW_PRIVATE_KEY));

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.SETTINGS.REVEAL_PRIVATE_CREDENTIAL,
      {
        credentialName: 'private_key',
        shouldUpdateNav: true,
      },
    );
  });
});
