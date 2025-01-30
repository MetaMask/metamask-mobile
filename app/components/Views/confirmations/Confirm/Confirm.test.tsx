import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import renderWithProvider from '../../../../util/test/renderWithProvider';
import {
  personalSignatureConfirmationState,
  securityAlertResponse,
  typedSignV1ConfirmationState,
} from '../../../../util/test/confirm-data-helpers';
import Confirm from './index';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

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
  },
}));

jest.mock('../../../../util/address', () => ({
  ...jest.requireActual('../../../../util/address'),
  getAddressAccountType: (str: string) => str,
}));

jest.mock('react-native-gzip', () => ({
  deflate: (str: string) => str,
}));

describe('Confirm', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockGoBack.mockClear();
  });

  it('should render correct information for personal sign', async () => {
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

  it('should render correct information for typed sign v1', async () => {
    const { getAllByRole, getAllByText, getByText, queryByText } = renderWithProvider(
      <SafeAreaProvider>
        <Confirm />
      </SafeAreaProvider>, {
        state: typedSignV1ConfirmationState,
      });
    expect(getByText('Signature request')).toBeDefined();
    expect(getByText('Request from')).toBeDefined();
    expect(getByText('metamask.github.io')).toBeDefined();
    expect(getAllByText('Message')).toHaveLength(2);
    expect(getByText('Hi, Alice!')).toBeDefined();
    expect(getAllByRole('button')).toHaveLength(2);
    expect(queryByText('This is a deceptive request')).toBeNull();
  });

  it('should render blockaid banner if confirmation has blockaid error response', async () => {
    const { getByText } = renderWithProvider(
      <SafeAreaProvider>
          <Confirm />
        </SafeAreaProvider>, {
        state: {
          ...typedSignV1ConfirmationState,
          signatureRequest: { securityAlertResponse },
        },
      });
    expect(getByText('Signature request')).toBeDefined();
    expect(getByText('This is a deceptive request')).toBeDefined();
  });
});
