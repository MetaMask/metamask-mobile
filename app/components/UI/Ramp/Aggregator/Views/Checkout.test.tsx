import { Provider } from '@consensys/on-ramp-sdk';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import Checkout from './Checkout';
import { RampSDK } from '../sdk';
import Routes from '../../../../../constants/navigation/Routes';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../../../util/test/accountsControllerTestUtils';
import { createCustomOrderIdData } from '../orderProcessor/customOrderId';
import { Network } from '@consensys/on-ramp-sdk/dist/API';
import Logger from '../../../../../util/Logger';

const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => mockDispatch,
}));

const mockTrackEvent = jest.fn();
jest.mock('../../hooks/useAnalytics', () => () => mockTrackEvent);

const mockHandleSuccessfulOrder = jest.fn();
jest.mock(
  '../hooks/useHandleSuccessfulOrder',
  () => () => mockHandleSuccessfulOrder,
);

const mockSetOptions = jest.fn();
const mockNavigation = {
  setOptions: mockSetOptions,
  dangerouslyGetParent: () => ({ pop: jest.fn() }),
};
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
}));

jest.mock('../orderProcessor/customOrderId');

const mockUseRampSDKInitialValues: Partial<RampSDK> = {
  selectedAddress: '0x123',
  selectedAsset: undefined,
  sdkError: undefined,
  callbackBaseUrl: 'https://callback.test',
  isBuy: true,
};

let mockUseRampSDKValues: Partial<RampSDK> = {
  ...mockUseRampSDKInitialValues,
};

jest.mock('../sdk', () => ({
  ...jest.requireActual('../sdk'),
  useRampSDK: () => mockUseRampSDKValues,
  SDK: {
    orders: jest.fn().mockResolvedValue({
      getOrderFromCallback: jest.fn(),
    }),
  },
}));

const mockUseParams = jest.fn(() => ({
  url: 'https://test.url',
  customOrderId: 'test-order-id',
  provider: { id: 'test-provider', name: 'Test Provider' } as Provider,
}));

jest.mock('../../../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../../../util/navigation/navUtils'),
  useParams: () => mockUseParams(),
}));

function render() {
  return renderScreen(
    Checkout,
    {
      name: Routes.RAMP.CHECKOUT,
    },
    {
      state: {
        engine: {
          backgroundState: {
            ...backgroundState,
            AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
          },
        },
      },
    },
  );
}

describe('Checkout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRampSDKValues = {
      ...mockUseRampSDKInitialValues,
    };
  });

  it('uses selectedAsset network chainId when available', () => {
    mockUseRampSDKValues.selectedAsset = {
      id: '1',
      idv2: '2',
      legacyId: 'legacy-1',
      network: {
        active: true,
        chainId: '137',
        chainName: 'Polygon',
        shortName: 'Polygon',
      },
      symbol: 'USDC',
      logo: 'logo',
      decimals: 6,
      address: '0x123',
      name: 'USD Coin',
      limits: ['1', '1000'],
      sellEnabled: true,
      assetId: 'asset-1',
    } as const;

    render();

    expect(createCustomOrderIdData).toHaveBeenCalledWith(
      'test-order-id',
      '137',
      '0x123',
      'BUY',
    );
  });

  it('uses selectedAsset network chainId when chainId is 1', () => {
    mockUseRampSDKValues.selectedAsset = {
      id: '1',
      idv2: '2',
      legacyId: 'legacy-1',
      network: {
        active: true,
        chainId: '1',
        chainName: 'Test',
        shortName: 'Test',
      },
      symbol: 'USDC',
      logo: 'logo',
      decimals: 6,
      address: '0x123',
      name: 'USD Coin',
      limits: ['1', '1000'],
      sellEnabled: true,
      assetId: 'asset-1',
    } as const;

    render();

    expect(createCustomOrderIdData).toHaveBeenCalledWith(
      'test-order-id',
      '1',
      '0x123',
      'BUY',
    );
  });

  it('handles undefined selectedAsset gracefully', () => {
    mockUseRampSDKValues.selectedAsset = undefined;

    render();

    expect(createCustomOrderIdData).not.toHaveBeenCalled();
  });

  it('returns early from handleCancelPress when chainId is not available', () => {
    mockUseRampSDKValues.selectedAsset = {
      id: '1',
      idv2: '2',
      legacyId: 'legacy-1',
      network: {
        active: true,
        chainId: undefined as unknown as string, // No chainId
        chainName: 'Test',
        shortName: 'Test',
      },
      symbol: 'USDC',
      logo: 'logo',
      decimals: 6,
      address: '0x123',
      name: 'USD Coin',
      limits: ['1', '1000'],
      sellEnabled: true,
      assetId: 'asset-1',
    } as const;

    render();

    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it('returns early from handleCancelPress when selectedAsset network is undefined', () => {
    mockUseRampSDKValues.selectedAsset = {
      id: '1',
      idv2: '2',
      legacyId: 'legacy-1',
      network: undefined as unknown as Network, // No network
      symbol: 'USDC',
      logo: 'logo',
      decimals: 6,
      address: '0x123',
      name: 'USD Coin',
      limits: ['1', '1000'],
      sellEnabled: true,
      assetId: 'asset-1',
    } as const;

    render();

    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it('handles navigation state change when selectedAddress is undefined', () => {
    mockUseRampSDKValues.selectedAddress = undefined;

    render();

    expect(mockHandleSuccessfulOrder).not.toHaveBeenCalled();
  });

  it('logs error when selectedAddress is undefined during navigation state change', async () => {
    mockUseRampSDKValues.selectedAddress = undefined;

    const mockLoggerError = jest.spyOn(Logger, 'error');

    const { getByTestId } = render();

    const webView = getByTestId('checkout-webview');
    if (webView?.props?.onNavigationStateChange) {
      await webView.props.onNavigationStateChange({
        url: 'https://callback.test?success=true',
        loading: false,
        title: '',
        canGoBack: false,
        canGoForward: false,
      });
    }

    expect(mockLoggerError).toHaveBeenCalledWith(
      new Error('No address available for selected asset'),
    );
  });
});
