import React from 'react';
import { waitFor } from '@testing-library/react-native';
import { BackHandler, NativeEventSubscription } from 'react-native';
import SmartAccountNetworkList from './SmartAccountNetworkList';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';

const mockAccountsState = {};

const mockAddress = '0x1234567890123456789012345678901234567890';

// Mock navigation
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: mockGoBack,
  }),
}));

jest.mock('../../../../confirmations/hooks/7702/useEIP7702Networks', () => ({
  useEIP7702Networks: jest.fn(),
}));

jest.mock(
  '../../../../confirmations/components/modals/switch-account-type-modal/account-network-row',
  () => jest.fn(() => null),
);

import { useEIP7702Networks } from '../../../../confirmations/hooks/7702/useEIP7702Networks';

const mockUseEIP7702Networks = useEIP7702Networks as jest.MockedFunction<
  typeof useEIP7702Networks
>;

describe('SmartAccountNetworkList', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockGoBack.mockClear();
    mockUseEIP7702Networks.mockReturnValue({
      network7702List: [
        {
          chainId: '0x1:mainnet',
          name: 'Ethereum Mainnet',
          isEvm: true,
          nativeCurrency: 'eip155:1/slip44:60',
          blockExplorerUrls: [],
          defaultBlockExplorerUrlIndex: 0,
          isSupported: true,
          upgradeContractAddress: '0x123',
        },
      ],
      networkSupporting7702Present: true,
      pending: false,
    });
  });

  it('renders network list when data is available', async () => {
    const { getByTestId } = renderWithProvider(
      <SmartAccountNetworkList address={mockAddress} />,
      { state: mockAccountsState },
    );

    await waitFor(() => {
      expect(getByTestId('network-flat-list')).toBeTruthy();
    });
  });

  it('handles hardware back press by navigating back and prevents default', () => {
    const removeMock = jest.fn();
    const addListenerSpy = jest
      .spyOn(BackHandler, 'addEventListener')
      .mockImplementation(
        (
          event: 'hardwareBackPress',
          _handler: () => boolean | null | undefined,
        ): NativeEventSubscription => {
          expect(event).toBe('hardwareBackPress');
          return { remove: removeMock } as unknown as NativeEventSubscription;
        },
      );

    const { unmount } = renderWithProvider(
      <SmartAccountNetworkList address={mockAddress} />,
      { state: mockAccountsState },
    );

    // Multiple subscriptions may exist; invoke until one triggers goBack
    let foundHandlerCalledGoBack = false;
    let observedResult: boolean | null | undefined;
    for (const call of addListenerSpy.mock.calls) {
      const maybeHandler = call?.[1] as
        | (() => boolean | null | undefined)
        | undefined;
      if (!maybeHandler) {
        continue;
      }
      mockGoBack.mockClear();
      observedResult = maybeHandler();
      if (mockGoBack.mock.calls.length > 0) {
        foundHandlerCalledGoBack = true;
        break;
      }
    }

    expect(foundHandlerCalledGoBack).toBe(true);
    expect(observedResult).toBe(true);

    unmount();
    expect(removeMock).toHaveBeenCalled();

    addListenerSpy.mockRestore();
  });

  it('returns null when pending', () => {
    mockUseEIP7702Networks.mockReturnValue({
      network7702List: [],
      networkSupporting7702Present: false,
      pending: true,
    });

    const { queryByTestId } = renderWithProvider(
      <SmartAccountNetworkList address={mockAddress} />,
      { state: mockAccountsState },
    );

    expect(queryByTestId('network-flat-list')).toBeNull();
  });

  it('renders empty list when no networks available', () => {
    mockUseEIP7702Networks.mockReturnValue({
      network7702List: [],
      networkSupporting7702Present: false,
      pending: false,
    });

    const { getByTestId } = renderWithProvider(
      <SmartAccountNetworkList address={mockAddress} />,
      { state: mockAccountsState },
    );

    expect(getByTestId('network-flat-list')).toBeTruthy();
    expect(getByTestId('network-flat-list').children).toHaveLength(0);
  });
});
