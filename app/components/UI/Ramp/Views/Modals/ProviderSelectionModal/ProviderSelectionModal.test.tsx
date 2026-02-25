import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
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

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: mockGoBack, navigate: jest.fn() }),
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

jest.mock(
  '../../../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const ReactActual = jest.requireActual('react');
    return ReactActual.forwardRef(
      (
        { children }: { children: React.ReactNode },
        _ref: React.Ref<unknown>,
      ) => <>{children}</>,
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
    mockGetQuotes.mockResolvedValue({
      success: [],
      error: [],
      sorted: [],
      customActions: [],
    });
    mockUseRampsController.mockImplementation(() => defaultControllerReturn);
    mockUseParams.mockReturnValue({ amount: 100 });
  });

  it('matches snapshot', async () => {
    const { toJSON } = renderWithProvider(ProviderSelectionModal);
    await waitFor(() => {
      expect(mockGetQuotes).toHaveBeenCalled();
    });
    expect(toJSON()).toMatchSnapshot();
  });

  it('calls getQuotes with provider params on mount', async () => {
    renderWithProvider(ProviderSelectionModal);

    await waitFor(() => {
      expect(mockGetQuotes).toHaveBeenCalledWith({
        amount: 100,
        walletAddress: '0x123',
        assetId: 'eip155:1/slip44:60',
        providers: ['/providers/transak', '/providers/moonpay'],
        paymentMethods: ['/payments/debit-credit-card-1'],
        forceRefresh: true,
      });
    });
  });

  it('calls setSelectedProvider and goBack when provider is selected', async () => {
    const { getByText } = renderWithProvider(ProviderSelectionModal);

    await waitFor(() => {
      expect(mockGetQuotes).toHaveBeenCalled();
    });

    fireEvent.press(getByText('Transak'));

    expect(mockSetSelectedProvider).toHaveBeenCalledWith(
      expect.objectContaining({ id: '/providers/transak' }),
    );
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('calls goBack when back button is pressed', async () => {
    const { getByTestId } = renderWithProvider(ProviderSelectionModal);

    await waitFor(() => {
      expect(mockGetQuotes).toHaveBeenCalled();
    });

    fireEvent.press(getByTestId('button-icon'));

    expect(mockGoBack).toHaveBeenCalled();
  });

  it('does not fetch quotes when skipQuotes is true', () => {
    mockUseParams.mockReturnValue({
      assetId: 'eip155:1/slip44:60',
      skipQuotes: true,
    });
    renderWithProvider(ProviderSelectionModal);

    expect(mockGetQuotes).not.toHaveBeenCalled();
  });

  it('filters providers by assetId when provided', () => {
    const assetId = 'eip155:1/erc20:0x123';
    mockUseParams.mockReturnValue({ assetId, skipQuotes: true });
    mockUseRampsController.mockImplementation(() => ({
      ...defaultControllerReturn,
      providers: [
        {
          ...mockProviders[0],
          supportedCryptoCurrencies: { [assetId]: true },
        },
        {
          ...mockProviders[1],
          supportedCryptoCurrencies: { [assetId]: true },
        },
        {
          id: '/providers/other',
          name: 'Other',
          supportedCryptoCurrencies: { 'eip155:1/slip44:60': true },
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
});
