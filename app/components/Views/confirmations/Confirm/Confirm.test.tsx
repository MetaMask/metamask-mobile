import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import renderWithProvider from '../../../../util/test/renderWithProvider';
import {
  personalSignatureConfirmationState,
  securityAlertResponse,
  stakingDepositConfirmationState,
  typedSignV1ConfirmationState,
} from '../../../../util/test/confirm-data-helpers';
// eslint-disable-next-line import/no-namespace
import * as ConfirmationRedesignEnabled from '../hooks/useConfirmationRedesignEnabled';

import Confirm from './index';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    addListener: jest.fn(),
    dispatch: jest.fn(),
    goBack: jest.fn(),
    navigate: jest.fn(),
    removeListener: jest.fn(), 
  }),
}));

jest.mock('react-native/Libraries/Linking/Linking', () => ({
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  openURL: jest.fn(),
  canOpenURL: jest.fn(),
  getInitialURL: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => {
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  const frame = { width: 0, height: 0, x: 0, y: 0 };
  
  return {
    ...jest.requireActual('react-native-safe-area-context'),
    SafeAreaProvider: jest.fn().mockImplementation(({ children }) => children),
    SafeAreaConsumer: jest
      .fn()
      .mockImplementation(({ children }) => children(inset)),
    useSafeAreaInsets: jest.fn().mockImplementation(() => inset),
    useSafeAreaFrame: jest.fn().mockImplementation(() => frame),
  };
});

jest.mock('../../../../core/Engine', () => ({
  getTotalFiatAccountBalance: () => ({ tokenFiat: 10 }),
  context: {
    KeyringController: {
      state: {
        keyrings: [],
      },
      getOrAddQRKeyring: jest.fn(),
    },
  },
  controllerMessenger: {
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  },
}));

jest.mock('react-native-gzip', () => ({
  deflate: (str: string) => str,
}));

describe('Confirm', () => {
  it('renders a flat confirmation for specified type(s): staking deposit', () => {
    const { getByTestId } = renderWithProvider(<Confirm />, {
      state: stakingDepositConfirmationState,
    });
    expect(getByTestId('flat-confirmation-container')).toBeDefined();
  });

  it('renders a modal confirmation', () => {
    const { getByTestId } = renderWithProvider(
      <SafeAreaProvider>
        <Confirm />
      </SafeAreaProvider>,
      {
        state: typedSignV1ConfirmationState,
      },
    );
    expect(getByTestId('modal-confirmation-container')).toBeDefined();
  });

  it('renders correct information for personal sign', () => {
    const { getAllByRole, getByText } = renderWithProvider(
      <SafeAreaProvider>
        <Confirm />
      </SafeAreaProvider>,
      {
        state: personalSignatureConfirmationState,
      },
    );
    expect(getByText('Signature request')).toBeDefined();
    expect(
      getByText('Review request details before you confirm.'),
    ).toBeDefined();
    expect(getByText('Request from')).toBeDefined();
    expect(getByText('metamask.github.io')).toBeDefined();
    expect(getByText('Message')).toBeDefined();
    expect(getByText('Example `personal_sign` message')).toBeDefined();
    expect(getAllByRole('button')).toHaveLength(2);
  });

  it('renders correct information for typed sign v1', () => {
    const { getAllByRole, getAllByText, getByText, queryByText } =
      renderWithProvider(
        <SafeAreaProvider>
          <Confirm />
        </SafeAreaProvider>,
        {
          state: typedSignV1ConfirmationState,
        },
      );
    expect(getByText('Signature request')).toBeDefined();
    expect(getByText('Request from')).toBeDefined();
    expect(getByText('metamask.github.io')).toBeDefined();
    expect(getAllByText('Message')).toHaveLength(2);
    expect(getByText('Hi, Alice!')).toBeDefined();
    expect(getAllByRole('button')).toHaveLength(2);
    expect(queryByText('This is a deceptive request')).toBeNull();
  });

  it('renders a blockaid banner if the confirmation has blockaid error response', () => {
    const { getByText } = renderWithProvider(
      <SafeAreaProvider>
        <Confirm />
      </SafeAreaProvider>,
      {
        state: {
          ...typedSignV1ConfirmationState,
          signatureRequest: { securityAlertResponse },
        },
      },
    );
    expect(getByText('Signature request')).toBeDefined();
    expect(getByText('This is a deceptive request')).toBeDefined();
  });

  it('returns null if confirmation redesign is not enabled', () => {
    jest
      .spyOn(ConfirmationRedesignEnabled, 'useConfirmationRedesignEnabled')
      .mockReturnValue({ isRedesignedEnabled: false });
    const { queryByText } = renderWithProvider(<Confirm />, {
      state: {
        ...typedSignV1ConfirmationState,
        signatureRequest: { securityAlertResponse },
      },
    });
    expect(queryByText('Signature request')).toBeNull();
  });
});
