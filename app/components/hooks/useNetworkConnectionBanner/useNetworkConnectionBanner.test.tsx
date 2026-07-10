import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { useNavigation } from '@react-navigation/native';

import useNetworkConnectionBanner from './useNetworkConnectionBanner';
import Engine from '../../../core/Engine';
import { useMessenger } from '../../../hooks/useMessenger';
import { useAnalytics } from '../useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../core/Analytics';
import {
  selectNetworkConnectionBannerStatus,
  selectNetworkConnectionBannerNetwork,
} from '../../../selectors/networkConnectionBanner';
import Routes from '../../../constants/navigation/Routes';
import { isPublicEndpointUrl } from '../../../core/Engine/controllers/network-controller/utils';
import {
  ToastContext,
  ToastVariants,
} from '../../../component-library/components/Toast';
import { IconName } from '../../../component-library/components/Icons/Icon';

jest.mock('@react-navigation/native');
jest.mock('../../../core/Engine', () => ({
  lookupEnabledNetworks: jest.fn(),
}));
jest.mock('../../../hooks/useMessenger');
jest.mock('../useAnalytics/useAnalytics');
jest.mock('../../../selectors/networkConnectionBanner');
jest.mock('../../../core/Engine/controllers/network-controller/utils', () => ({
  ...jest.requireActual(
    '../../../core/Engine/controllers/network-controller/utils',
  ),
  isPublicEndpointUrl: jest.fn(),
}));
jest.mock('../../../constants/network', () => ({
  ...jest.requireActual('../../../constants/network'),
  INFURA_PROJECT_ID: 'test-infura-project-id',
}));

const mockStore = configureMockStore();
const mockNavigate = jest.fn();
const mockShowToast = jest.fn();
const mockToastRef = {
  current: { showToast: mockShowToast, closeToast: jest.fn() },
};

const mockMessengerCall = jest.fn(async () => undefined);

const statusMock = jest.mocked(selectNetworkConnectionBannerStatus);
const networkMock = jest.mocked(selectNetworkConnectionBannerNetwork);

/**
 * Configure the mocked controller selectors to describe a failing network.
 *
 * @param overrides - Partial `FailedNetwork` fields to override the defaults.
 * @returns The full failing-network object the selector will return.
 */
function mockFailedNetwork(overrides: Record<string, unknown> = {}) {
  const network = {
    networkClientId: 'test-client',
    name: 'Ethereum Mainnet',
    rpcUrl: 'https://mainnet.infura.io/v3/test-infura-project-id',
    chainId: '0x1',
    isInfuraEndpoint: true,
    switchableInfuraNetworkClientId: null,
    ...overrides,
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  networkMock.mockReturnValue(network as any);
  return network;
}

describe('useNetworkConnectionBanner', () => {
  let mockTrackEvent: jest.Mock;
  let mockBuild: jest.Mock;
  let mockAddProperties: jest.Mock;
  let mockCreateEventBuilder: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    statusMock.mockReturnValue('available');
    networkMock.mockReturnValue(null);

    (useNavigation as jest.Mock).mockReturnValue({ navigate: mockNavigate });
    jest.mocked(isPublicEndpointUrl).mockReturnValue(true);

    mockTrackEvent = jest.fn();
    mockBuild = jest.fn(() => ({ event: 'test-event', properties: {} }));
    mockAddProperties = jest.fn().mockReturnThis();
    mockCreateEventBuilder = jest.fn(() => ({
      addProperties: mockAddProperties,
      build: mockBuild,
    }));
    (useAnalytics as jest.Mock).mockReturnValue({
      trackEvent: mockTrackEvent,
      createEventBuilder: mockCreateEventBuilder,
    });

    (useMessenger as jest.Mock).mockReturnValue({ call: mockMessengerCall });
  });

  const renderHookWithProviders = () => {
    const store = mockStore({});
    return renderHook(() => useNetworkConnectionBanner(), {
      wrapper: ({ children }) => (
        <Provider store={store}>
          <ToastContext.Provider
            value={
              { toastRef: mockToastRef } as unknown as React.ContextType<
                typeof ToastContext
              >
            }
          >
            {children}
          </ToastContext.Provider>
        </Provider>
      ),
    });
  };

  it('returns the banner state from the controller selectors', () => {
    const { result } = renderHookWithProviders();
    expect(result.current.status).toBe('available');
    expect(result.current.network).toBeNull();
  });

  it('refreshes enabled network metadata on mount', () => {
    renderHookWithProviders();
    expect(Engine.lookupEnabledNetworks).toHaveBeenCalledTimes(1);
  });

  it('fires the banner shown analytics event when the banner becomes visible', () => {
    statusMock.mockReturnValue('degraded');
    mockFailedNetwork();

    renderHookWithProviders();

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.NETWORK_CONNECTION_BANNER_SHOWN,
    );
    expect(mockAddProperties).toHaveBeenCalledWith(
      expect.objectContaining({
        banner_type: 'degraded',
        chain_id_caip: 'eip155:1',
      }),
    );
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
  });

  it('does not fire analytics when the banner is hidden', () => {
    renderHookWithProviders();
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  describe('updateRpc', () => {
    it('navigates to the edit network screen and tracks the click event', () => {
      statusMock.mockReturnValue('degraded');
      mockFailedNetwork({
        name: 'Polygon Mainnet',
        rpcUrl: 'https://polygon-rpc.com',
        chainId: '0x89',
      });
      const { result } = renderHookWithProviders();

      act(() => {
        result.current.updateRpc();
      });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.EDIT_NETWORK, {
        network: 'https://polygon-rpc.com',
        shouldNetworkSwitchPopToWallet: false,
        shouldShowPopularNetworks: false,
        trackRpcUpdateFromBanner: true,
      });
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.NETWORK_CONNECTION_BANNER_UPDATE_RPC_CLICKED,
      );
      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          banner_type: 'degraded',
          chain_id_caip: 'eip155:137',
        }),
      );
    });

    it('records the RPC as "custom" when the URL is not public', () => {
      jest.mocked(isPublicEndpointUrl).mockReturnValue(false);
      statusMock.mockReturnValue('unavailable');
      mockFailedNetwork({
        rpcUrl: 'https://my-private-rpc.example',
        chainId: '0x1',
        isInfuraEndpoint: false,
      });
      const { result } = renderHookWithProviders();

      act(() => {
        result.current.updateRpc();
      });

      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          rpc_domain: 'custom',
          rpc_endpoint_url: 'custom',
        }),
      );
    });
  });

  describe('switchToInfura', () => {
    it('is a no-op when the banner is not visible', async () => {
      const { result } = renderHookWithProviders();

      await act(async () => {
        await result.current.switchToInfura();
      });

      expect(mockMessengerCall).not.toHaveBeenCalled();
    });

    it('is a no-op when no Infura endpoint is available', async () => {
      statusMock.mockReturnValue('degraded');
      mockFailedNetwork({
        name: 'Polygon Mainnet',
        rpcUrl: 'https://polygon-rpc.com',
        chainId: '0x89',
        isInfuraEndpoint: false,
        switchableInfuraNetworkClientId: null,
      });
      const { result } = renderHookWithProviders();

      await act(async () => {
        await result.current.switchToInfura();
      });

      expect(mockMessengerCall).not.toHaveBeenCalled();
    });

    it('delegates to the controller, fires analytics, and shows a success toast', async () => {
      statusMock.mockReturnValue('unavailable');
      mockFailedNetwork({
        name: 'Polygon Mainnet',
        rpcUrl: 'https://polygon-rpc.com',
        chainId: '0x89',
        isInfuraEndpoint: false,
        switchableInfuraNetworkClientId: 'mainnet',
      });
      const { result } = renderHookWithProviders();

      await act(async () => {
        await result.current.switchToInfura();
      });

      expect(mockMessengerCall).toHaveBeenCalledWith(
        'NetworkConnectionBannerController:switchToDefaultInfuraRpcEndpoint',
        '0x89',
      );
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.NETWORK_CONNECTION_BANNER_SWITCH_TO_METAMASK_DEFAULT_RPC_CLICKED,
      );
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: ToastVariants.Icon,
          iconName: IconName.Confirmation,
        }),
      );
    });

    it('does not show the toast when the controller rejects', async () => {
      mockMessengerCall.mockRejectedValueOnce(new Error('boom'));
      statusMock.mockReturnValue('unavailable');
      mockFailedNetwork({
        name: 'Polygon Mainnet',
        rpcUrl: 'https://polygon-rpc.com',
        chainId: '0x89',
        isInfuraEndpoint: false,
        switchableInfuraNetworkClientId: 'mainnet',
      });
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);
      const { result } = renderHookWithProviders();

      await act(async () => {
        await result.current.switchToInfura();
      });

      expect(mockShowToast).not.toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });
});
