import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import ProviderSelectionModal, {
  type ProviderSelectionModalParams,
} from './ProviderSelectionModal';
import { renderScreen } from '../../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import Routes from '../../../../../../constants/navigation/Routes';
import Engine from '../../../../../../core/Engine';

jest.mock('../../../../../Base/RemoteImage', () => jest.fn(() => null));

const mockGetQuotes = jest.mocked(Engine.context.RampsController.getQuotes);
const mockGoBack = jest.fn();
const mockSetSelectedProvider = jest.fn();

const mockNavigationState = {
  routes: [
    { name: Routes.RAMP.MODALS.PAYMENT_SELECTION, key: 'payment' },
    { name: Routes.RAMP.MODALS.PROVIDER_SELECTION, key: 'provider' },
  ],
  index: 1,
  key: 'modals',
  routeNames: [
    Routes.RAMP.MODALS.PAYMENT_SELECTION,
    Routes.RAMP.MODALS.PROVIDER_SELECTION,
  ],
  type: 'stack' as const,
  stale: false as const,
};

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: mockGoBack, navigate: mockNavigate }),
  useNavigationState: (
    selector: (state: typeof mockNavigationState) => unknown,
  ) => selector(mockNavigationState),
}));

const mockUseParams = jest.fn<ProviderSelectionModalParams, []>(() => ({
  amount: 100,
}));
jest.mock('../../../../../../util/navigation/navUtils', () => ({
  createNavigationDetails: jest.fn(),
  useParams: () => mockUseParams(),
}));

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
  locale: 'en',
}));

jest.mock('react-native', () => {
  const actualReactNative = jest.requireActual('react-native');
  return {
    ...actualReactNative,
    useWindowDimensions: () => ({
      width: 375,
      height: 812,
    }),
  };
});

const defaultTestAssetId = 'eip155:1/slip44:60';

const mockProviders = [
  {
    id: '/providers/transak',
    name: 'Transak',
    environmentType: 'PRODUCTION',
    description: 'Test provider',
    hqAddress: 'Test Address',
    links: [],
    logos: {
      light: 'https://example.com/logo-light.png',
      dark: 'https://example.com/logo-dark.png',
      height: 24,
      width: 90,
    },
    supportedCryptoCurrencies: { [defaultTestAssetId]: true },
  },
  {
    id: '/providers/moonpay',
    name: 'MoonPay',
    environmentType: 'PRODUCTION',
    description: 'Test provider 2',
    hqAddress: 'Test Address 2',
    links: [],
    logos: {
      light: 'https://example.com/moonpay-light.png',
      dark: 'https://example.com/moonpay-dark.png',
      height: 24,
      width: 90,
    },
    supportedCryptoCurrencies: { [defaultTestAssetId]: true },
  },
];

const defaultControllerReturn = {
  providers: mockProviders,
  selectedProvider: mockProviders[0],
  setSelectedProvider: mockSetSelectedProvider,
  selectedPaymentMethod: {
    id: '/payments/debit-credit-card-1',
    paymentType: 'debit-credit-card',
    name: 'Debit or Credit',
    score: 90,
    icon: 'card',
    disclaimer: '',
    delay: '',
    pendingOrderDescription: '',
  },
  selectedToken: {
    assetId: 'eip155:1/slip44:60',
    chainId: 'eip155:1',
    symbol: 'ETH',
  },
  getQuotes: mockGetQuotes,
  userRegion: { regionCode: 'us', country: { currency: 'USD' } },
};

const mockUseRampsController = jest.fn(() => defaultControllerReturn);
jest.mock('../../../hooks/useRampsController', () => ({
  useRampsController: () => mockUseRampsController(),
}));

jest.mock('../../../hooks/useRampAccountAddress', () => ({
  __esModule: true,
  default: () => '0x123',
}));

const mockUseRampsQuotes = jest.fn((_opts?: unknown) => ({
  data: null,
  loading: false,
  status: 'idle' as const,
  isSuccess: false,
  error: null,
  getQuotes: mockGetQuotes,
  getBuyWidgetData: jest.fn(),
}));

jest.mock('../../../hooks/useRampsQuotes', () => ({
  useRampsQuotes: (opts: unknown) => mockUseRampsQuotes(opts),
}));

let capturedOnClose: ((hasPendingAction?: boolean) => void) | undefined;

jest.mock(
  '../../../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const ReactActual = jest.requireActual('react');
    return ReactActual.forwardRef(
      (
        {
          children,
          onClose,
        }: {
          children: React.ReactNode;
          onClose?: (hasPendingAction?: boolean) => void;
        },
        _ref: React.Ref<unknown>,
      ) => {
        capturedOnClose = onClose;
        return <>{children}</>;
      },
    );
  },
);

function renderWithProvider(component: React.ComponentType) {
  return renderScreen(
    component,
    {
      name: Routes.RAMP.MODALS.PROVIDER_SELECTION,
    },
    {
      state: {
        engine: {
          backgroundState,
        },
      },
    },
  );
}

describe('ProviderSelectionModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRampsQuotes.mockReturnValue({
      data: null,
      loading: false,
      status: 'idle' as const,
      isSuccess: false,
      error: null,
      getQuotes: mockGetQuotes,
      getBuyWidgetData: jest.fn(),
    });
    mockUseRampsController.mockImplementation(() => defaultControllerReturn);
    mockUseParams.mockReturnValue({ amount: 100 });
  });

  it('matches snapshot', () => {
    const { toJSON } = renderWithProvider(ProviderSelectionModal);
    expect(toJSON()).toMatchSnapshot();
  });

  it('calls useRampsQuotes with provider params on mount', () => {
    renderWithProvider(ProviderSelectionModal);

    expect(mockUseRampsQuotes).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 100,
        walletAddress: '0x123',
        assetId: 'eip155:1/slip44:60',
        providers: ['/providers/transak', '/providers/moonpay'],
        paymentMethods: ['/payments/debit-credit-card-1'],
      }),
    );
  });

  it('calls setSelectedProvider and goBack when provider is selected', () => {
    const { getByText } = renderWithProvider(ProviderSelectionModal);

    fireEvent.press(getByText('Transak'));

    expect(mockSetSelectedProvider).toHaveBeenCalledWith(
      expect.objectContaining({ id: '/providers/transak' }),
    );
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('calls goBack when back button is pressed', () => {
    const { getByTestId } = renderWithProvider(ProviderSelectionModal);

    fireEvent.press(getByTestId('button-icon'));

    expect(mockGoBack).toHaveBeenCalled();
  });

  it('does not fetch quotes when skipQuotes is true', () => {
    mockUseParams.mockReturnValue({
      assetId: 'eip155:1/slip44:60',
      skipQuotes: true,
    });
    renderWithProvider(ProviderSelectionModal);

    expect(mockUseRampsQuotes).toHaveBeenCalledWith(null);
  });

  it('filters providers by selectedToken.assetId when route assetId is omitted', () => {
    mockUseParams.mockReturnValue({ amount: 100, skipQuotes: true });
    mockUseRampsController.mockImplementation(() => ({
      ...defaultControllerReturn,
      providers: [
        {
          ...mockProviders[0],
          supportedCryptoCurrencies: { [defaultTestAssetId]: true },
        },
        {
          ...mockProviders[1],
          supportedCryptoCurrencies: { [defaultTestAssetId]: false },
        },
      ],
    }));
    const { getByText, queryByText } = renderWithProvider(
      ProviderSelectionModal,
    );

    expect(getByText('Transak')).toBeOnTheScreen();
    expect(queryByText('MoonPay')).toBeNull();
  });

  it('filters providers by assetId when provided', () => {
    const assetId = 'eip155:1/erc20:0x123';
    mockUseParams.mockReturnValue({ assetId, skipQuotes: true });
    mockUseRampsController.mockImplementation(() => ({
      ...defaultControllerReturn,
      providers: [
        {
          ...mockProviders[0],
          supportedCryptoCurrencies: {
            [assetId]: true,
            [defaultTestAssetId]: false,
          },
        },
        {
          ...mockProviders[1],
          supportedCryptoCurrencies: {
            [assetId]: true,
            [defaultTestAssetId]: false,
          },
        },
        {
          id: '/providers/other',
          name: 'Other',
          supportedCryptoCurrencies: {
            [defaultTestAssetId]: true,
            [assetId]: false,
          },
          environmentType: 'PRODUCTION',
          description: '',
          hqAddress: '',
          links: [],
          logos: { light: '', dark: '', height: 24, width: 90 },
        },
      ],
    }));
    const { getByText, queryByText } = renderWithProvider(
      ProviderSelectionModal,
    );

    expect(getByText('Transak')).toBeOnTheScreen();
    expect(getByText('MoonPay')).toBeOnTheScreen();
    expect(queryByText('Other')).toBeNull();
  });

  it('navigates to token selection when dismissed without action and skipQuotes is true', () => {
    mockUseParams.mockReturnValue({
      assetId: 'eip155:1/slip44:60',
      skipQuotes: true,
    });
    renderWithProvider(ProviderSelectionModal);

    capturedOnClose?.(false);

    expect(mockNavigate).toHaveBeenCalledWith(Routes.RAMP.TOKEN_SELECTION, {
      screen: Routes.RAMP.TOKEN_SELECTION,
    });
  });

  it('does not fetch quotes when selectedPaymentMethod is null', () => {
    mockUseRampsController.mockReturnValue({
      ...defaultControllerReturn,
      selectedPaymentMethod: null as never,
    });
    renderWithProvider(ProviderSelectionModal);

    expect(mockUseRampsQuotes).toHaveBeenCalledWith(null);
  });

  it('passes showQuotes as false when selectedPaymentMethod is null', () => {
    mockUseRampsController.mockReturnValue({
      ...defaultControllerReturn,
      selectedPaymentMethod: null as never,
    });
    const { queryByText } = renderWithProvider(ProviderSelectionModal);

    // Should not show "no quotes available" error since showQuotes is false
    expect(queryByText('fiat_on_ramp.no_quotes_available')).toBeNull();
  });

  it('does not navigate to token selection when dismissed without action and skipQuotes is false', () => {
    mockUseParams.mockReturnValue({ amount: 100 });
    renderWithProvider(ProviderSelectionModal);

    capturedOnClose?.(false);

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
