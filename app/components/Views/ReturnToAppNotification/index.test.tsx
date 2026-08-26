import React from 'react';
import { render, act } from '@testing-library/react-native';
import { toast } from '@metamask/design-system-react-native';
import ReturnToAppNotification from './index.tsx';
import { RPC_METHODS } from '../../../core/SDKConnect/SDKConnectConstants.ts';

let mockRouteParams: {
  method?: string;
  origin?: string;
  hideReturnToApp?: boolean;
} = {};

jest.mock('../../../../locales/i18n.js', () => ({
  strings: jest.fn().mockImplementation((key: string) => key),
}));

const mockWait = jest.fn(() => Promise.resolve());
jest.mock('../../../core/SDKConnect/utils/wait.util.ts', () => ({
  wait: (_: number) => mockWait(),
}));

const mockUseFavicon = jest.fn();
jest.mock('../../hooks/useFavicon/index.ts', () => ({
  useFavicon: (...args: unknown[]) => mockUseFavicon(...args),
}));

const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      goBack: mockGoBack,
    }),
    useRoute: () => ({
      params: mockRouteParams,
    }),
  };
});

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  return {
    ...actual,
    toast: Object.assign(jest.fn(), { dismiss: jest.fn() }),
  };
});

const flushPromises = () => act(() => Promise.resolve());

describe('ReturnToAppNotification', () => {
  const renderComponent = () => render(<ReturnToAppNotification />);

  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = {
      method: undefined,
      origin: 'https://example.com',
    };
    mockUseFavicon.mockReturnValue({
      isLoaded: true,
      faviconURI: { uri: 'https://example.com/favicon.png' },
    });
  });

  it('renders an empty fragment', () => {
    const { toJSON } = renderComponent();
    expect(toJSON()).toBeNull();
  });

  it('calls navigation.goBack when favicon is ready', async () => {
    renderComponent();
    await flushPromises();

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('shows return-to-app toast when hideReturnToApp is not set', async () => {
    mockRouteParams = { origin: 'https://example.com' };
    renderComponent();
    await flushPromises();

    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'sdk_return_to_app_toast.returnToAppLabel',
        hasNoTimeout: false,
        showCloseButton: false,
      }),
    );
  });

  it('does not show return-to-app toast when hideReturnToApp is true', async () => {
    mockRouteParams = {
      origin: 'https://example.com',
      hideReturnToApp: true,
    };
    renderComponent();
    await flushPromises();

    expect(toast).not.toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'sdk_return_to_app_toast.returnToAppLabel',
      }),
    );
  });

  it('shows method-specific toast for wallet_switchEthereumChain', async () => {
    mockRouteParams = {
      method: RPC_METHODS.WALLET_SWITCHETHEREUMCHAIN,
      origin: 'https://example.com',
    };
    renderComponent();
    await flushPromises();

    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'sdk_return_to_app_toast.networkSwitchMethodLabel',
      }),
    );
  });

  it('calls wait when method is in METHODS_TO_DELAY', async () => {
    mockRouteParams = {
      method: RPC_METHODS.WALLET_SWITCHETHEREUMCHAIN,
      origin: 'https://example.com',
    };
    renderComponent();
    await flushPromises();

    expect(mockWait).toHaveBeenCalled();
  });

  it('does not call wait for method delay when method is not in METHODS_TO_DELAY', async () => {
    mockRouteParams = {
      method: 'some_unknown_method',
      origin: 'https://example.com',
    };
    renderComponent();
    await flushPromises();

    // Only the delayBetweenToast wait fires (hideReturnToApp is not true)
    expect(mockWait).toHaveBeenCalledTimes(1);
  });

  it('omits start accessory when favicon URI is empty', async () => {
    mockUseFavicon.mockReturnValue({
      isLoaded: true,
      faviconURI: { uri: '' },
    });
    mockRouteParams = { origin: 'https://example.com' };
    renderComponent();
    await flushPromises();

    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'sdk_return_to_app_toast.returnToAppLabel',
        startAccessory: undefined,
      }),
    );
  });

  it('does not execute effect when favicon is not loaded', async () => {
    mockUseFavicon.mockReturnValue({
      isLoaded: false,
      faviconURI: { uri: 'https://example.com/favicon.png' },
    });
    renderComponent();
    await flushPromises();

    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('does not show method label for non-switchEthereumChain methods', async () => {
    mockRouteParams = {
      method: RPC_METHODS.ETH_SENDTRANSACTION,
      origin: 'https://example.com',
    };
    renderComponent();
    await flushPromises();

    expect(toast).not.toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'sdk_return_to_app_toast.networkSwitchMethodLabel',
      }),
    );

    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'sdk_return_to_app_toast.returnToAppLabel',
      }),
    );
  });

  it('shows both method toast and return-to-app toast for switchEthereumChain', async () => {
    mockRouteParams = {
      method: RPC_METHODS.WALLET_SWITCHETHEREUMCHAIN,
      origin: 'https://example.com',
    };
    renderComponent();
    await flushPromises();

    expect(toast).toHaveBeenCalledTimes(2);

    expect(toast).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        title: 'sdk_return_to_app_toast.networkSwitchMethodLabel',
      }),
    );

    expect(toast).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        title: 'sdk_return_to_app_toast.returnToAppLabel',
      }),
    );
  });

  it('does not execute effect more than once on re-render', async () => {
    const ui = <ReturnToAppNotification />;

    const { rerender } = render(ui);
    await flushPromises();

    expect(mockGoBack).toHaveBeenCalledTimes(1);

    rerender(ui);
    await flushPromises();

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('passes origin to useFavicon', async () => {
    mockRouteParams = { origin: 'https://dapp.io' };
    renderComponent();
    await flushPromises();

    expect(mockUseFavicon).toHaveBeenCalledWith('https://dapp.io');
  });

  it('passes empty string to useFavicon when origin is undefined', async () => {
    mockRouteParams = {};
    renderComponent();
    await flushPromises();

    expect(mockUseFavicon).toHaveBeenCalledWith('');
  });

  it('handles eth_requestAccounts which is in METHODS_TO_DELAY but falsy', async () => {
    mockRouteParams = {
      method: RPC_METHODS.ETH_REQUESTACCOUNTS,
      origin: 'https://example.com',
    };
    renderComponent();
    await flushPromises();

    // eth_requestAccounts is falsy in METHODS_TO_DELAY, so no delay-for-method wait;
    // only the delayBetweenToast wait fires
    expect(mockWait).toHaveBeenCalledTimes(1);
  });

  it('does not show method label when no method is provided', async () => {
    mockRouteParams = { origin: 'https://example.com' };
    renderComponent();
    await flushPromises();

    expect(toast).toHaveBeenCalledTimes(1);
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'sdk_return_to_app_toast.returnToAppLabel',
      }),
    );
  });

  it('does not call wait for delay when no method is provided', async () => {
    mockRouteParams = { origin: 'https://example.com' };
    renderComponent();
    await flushPromises();

    // Only delayBetweenToast wait
    expect(mockWait).toHaveBeenCalledTimes(1);
  });

  it('calls wait twice for methods in METHODS_TO_DELAY with hideReturnToApp false', async () => {
    mockRouteParams = {
      method: RPC_METHODS.ETH_SENDTRANSACTION,
      origin: 'https://example.com',
    };
    renderComponent();
    await flushPromises();

    // Once for delayAfterMethod, once for delayBetweenToast
    expect(mockWait).toHaveBeenCalledTimes(2);
  });

  it('calls wait only once for method delay when hideReturnToApp is true', async () => {
    mockRouteParams = {
      method: RPC_METHODS.ETH_SENDTRANSACTION,
      origin: 'https://example.com',
      hideReturnToApp: true,
    };
    renderComponent();
    await flushPromises();

    // Only delayAfterMethod, no delayBetweenToast because hideReturnToApp is true
    expect(mockWait).toHaveBeenCalledTimes(1);
  });

  it('does not show any toast when hideReturnToApp is true and method has no label', async () => {
    mockRouteParams = {
      method: RPC_METHODS.ETH_SENDTRANSACTION,
      origin: 'https://example.com',
      hideReturnToApp: true,
    };
    renderComponent();
    await flushPromises();

    expect(toast).not.toHaveBeenCalled();
  });

  it('shows only method label toast when hideReturnToApp is true and method is switchEthereumChain', async () => {
    mockRouteParams = {
      method: RPC_METHODS.WALLET_SWITCHETHEREUMCHAIN,
      origin: 'https://example.com',
      hideReturnToApp: true,
    };
    renderComponent();
    await flushPromises();

    expect(toast).toHaveBeenCalledTimes(1);
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'sdk_return_to_app_toast.networkSwitchMethodLabel',
      }),
    );
  });
});
