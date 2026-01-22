import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import PerpsProviderSelector from './PerpsProviderSelector';
import { usePerpsProvider } from '../../hooks/usePerpsProvider';
import { usePerpsLivePositions } from '../../hooks/stream';
import type { PerpsProviderInfo } from '../../controllers/types';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('../../hooks/usePerpsProvider');
jest.mock('../../hooks/stream', () => ({
  usePerpsLivePositions: jest.fn(),
}));

jest.mock('../../../../../component-library/hooks', () => ({
  useStyles: () => ({
    styles: {
      badgeContainer: {},
      badgeIcon: {},
      badgeText: {},
      badgeCollateral: {},
      badgeChevron: {},
      sheetContainer: {},
      providerRow: {},
      providerRowSelected: {},
      providerIcon: {},
      providerInfo: {},
      providerName: {},
      providerDetails: {},
      providerChain: {},
      checkmark: {},
      warningContainer: {},
      warningIcon: {},
      warningTitle: {},
      warningMessage: {},
    },
  }),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key, params) => {
    const translations: Record<string, string> = {
      'perps.provider_selector.title': 'Select provider',
      'perps.provider_selector.warning.title': 'Open positions',
      'perps.provider_selector.warning.message': `You have ${params?.count || 0} open position(s) on ${params?.fromProvider || ''}. These will remain open when you switch to ${params?.toProvider || ''}.`,
      'perps.provider_selector.warning.cancel': 'Cancel',
      'perps.provider_selector.warning.switch': 'Switch anyway',
    };
    return translations[key] || key;
  }),
}));

jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const { View } = jest.requireActual('react-native');
    const ReactLib = jest.requireActual('react');
    return {
      __esModule: true,
      default: ReactLib.forwardRef(
        (
          {
            children,
            testID,
            onClose,
          }: {
            children: React.ReactNode;
            testID?: string;
            onClose?: () => void;
          },
          ref: React.Ref<{
            onCloseBottomSheet: (callback?: () => void) => void;
            onOpenBottomSheet: () => void;
          }>,
        ) => {
          ReactLib.useImperativeHandle(ref, () => ({
            onCloseBottomSheet: (callback?: () => void) => {
              onClose?.();
              callback?.();
            },
            onOpenBottomSheet: jest.fn(),
          }));
          return <View testID={testID}>{children}</View>;
        },
      ),
    };
  },
);

jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheetHeader',
  () => {
    const { View } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: ({ children }: { children: React.ReactNode }) => (
        <View>{children}</View>
      ),
    };
  },
);

jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheetFooter',
  () => {
    const { View, TouchableOpacity, Text } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: ({
        buttonPropsArray,
      }: {
        buttonPropsArray: {
          label: string;
          onPress: () => void;
          testID?: string;
        }[];
      }) => (
        <View>
          {buttonPropsArray.map(
            (
              btn: { label: string; onPress: () => void; testID?: string },
              index: number,
            ) => (
              <TouchableOpacity
                key={index}
                onPress={btn.onPress}
                testID={btn.testID}
              >
                <Text>{btn.label}</Text>
              </TouchableOpacity>
            ),
          )}
        </View>
      ),
      ButtonsAlignment: { Horizontal: 'horizontal' },
    };
  },
);

jest.mock('../../../../../component-library/components/Icons/Icon', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ testID }: { testID?: string }) => <View testID={testID} />,
    IconName: {
      ArrowDown: 'ArrowDown',
      Check: 'Check',
      Warning: 'Warning',
    },
    IconSize: { Sm: 'sm', Md: 'md', Lg: 'lg', Xl: 'xl' },
    IconColor: {
      Alternative: 'Alternative',
      Primary: 'Primary',
      Warning: 'Warning',
    },
  };
});

jest.mock('../../../../../component-library/components/Texts/Text', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: Text,
    TextVariant: { BodySM: 'BodySM', BodyMD: 'BodyMD', HeadingMD: 'HeadingMD' },
    TextColor: { Default: 'Default', Alternative: 'Alternative' },
  };
});

jest.mock('../../../../../component-library/components/Buttons/Button', () => ({
  ButtonSize: { Lg: 'lg' },
  ButtonVariants: { Primary: 'primary', Secondary: 'secondary' },
}));

const mockUsePerpsProvider = usePerpsProvider as jest.MockedFunction<
  typeof usePerpsProvider
>;
const mockUsePerpsLivePositions = usePerpsLivePositions as jest.MockedFunction<
  typeof usePerpsLivePositions
>;

const mockProviders: PerpsProviderInfo[] = [
  {
    id: 'hyperliquid',
    name: 'HyperLiquid',
    chain: 'Arbitrum',
    collateral: 'USDC',
    collateralSymbol: 'USDC',
    chainId: '42161',
    iconUrl: 'https://example.com/hl.png',
    enabled: true,
  },
  {
    id: 'myx',
    name: 'MYX',
    chain: 'BNB Chain',
    collateral: 'USDT',
    collateralSymbol: 'USDT',
    chainId: '56',
    iconUrl: 'https://example.com/myx.png',
    enabled: true,
  },
];

describe('PerpsProviderSelector', () => {
  const mockSetActiveProvider = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
    mockUsePerpsLivePositions.mockReturnValue({
      positions: [],
      isInitialLoading: false,
    });
  });

  describe('Rendering', () => {
    it('returns null when currentProviderInfo is not available', () => {
      mockUsePerpsProvider.mockReturnValue({
        activeProvider: 'hyperliquid',
        availableProviders: [],
        currentProviderInfo: undefined,
        hasMultipleProviders: false,
        setActiveProvider: mockSetActiveProvider,
      });

      const { toJSON } = render(<PerpsProviderSelector testID="provider" />);
      expect(toJSON()).toBeNull();
    });

    it('returns null when only one provider is available', () => {
      mockUsePerpsProvider.mockReturnValue({
        activeProvider: 'hyperliquid',
        availableProviders: [mockProviders[0]],
        currentProviderInfo: mockProviders[0],
        hasMultipleProviders: false,
        setActiveProvider: mockSetActiveProvider,
      });

      const { toJSON } = render(<PerpsProviderSelector testID="provider" />);
      expect(toJSON()).toBeNull();
    });

    it('renders badge when multiple providers are available', () => {
      mockUsePerpsProvider.mockReturnValue({
        activeProvider: 'hyperliquid',
        availableProviders: mockProviders,
        currentProviderInfo: mockProviders[0],
        hasMultipleProviders: true,
        setActiveProvider: mockSetActiveProvider,
      });

      const { getByTestId } = render(
        <PerpsProviderSelector testID="provider" />,
      );
      expect(getByTestId('provider-badge')).toBeTruthy();
    });

    it('displays current provider name in badge', () => {
      mockUsePerpsProvider.mockReturnValue({
        activeProvider: 'hyperliquid',
        availableProviders: mockProviders,
        currentProviderInfo: mockProviders[0],
        hasMultipleProviders: true,
        setActiveProvider: mockSetActiveProvider,
      });

      const { getByText } = render(<PerpsProviderSelector testID="provider" />);
      expect(getByText('HyperLiquid')).toBeTruthy();
    });

    it('displays collateral symbol in badge', () => {
      mockUsePerpsProvider.mockReturnValue({
        activeProvider: 'hyperliquid',
        availableProviders: mockProviders,
        currentProviderInfo: mockProviders[0],
        hasMultipleProviders: true,
        setActiveProvider: mockSetActiveProvider,
      });

      const { getByText } = render(<PerpsProviderSelector testID="provider" />);
      expect(getByText('· USDC')).toBeTruthy();
    });
  });

  describe('Provider Selection Sheet', () => {
    it('navigates to provider selection modal when badge is pressed', () => {
      mockUsePerpsProvider.mockReturnValue({
        activeProvider: 'hyperliquid',
        availableProviders: mockProviders,
        currentProviderInfo: mockProviders[0],
        hasMultipleProviders: true,
        setActiveProvider: mockSetActiveProvider,
      });

      const { getByTestId } = render(
        <PerpsProviderSelector testID="provider" />,
      );
      fireEvent.press(getByTestId('provider-badge'));

      expect(mockNavigate).toHaveBeenCalledWith('PerpsModals', {
        screen: 'PerpsSelectProvider',
        params: expect.objectContaining({
          providers: mockProviders,
          activeProvider: 'hyperliquid',
          onSelectProvider: expect.any(Function),
        }),
      });
    });

    it('switches provider directly when no open positions via callback', async () => {
      mockUsePerpsProvider.mockReturnValue({
        activeProvider: 'hyperliquid',
        availableProviders: mockProviders,
        currentProviderInfo: mockProviders[0],
        hasMultipleProviders: true,
        setActiveProvider: mockSetActiveProvider,
      });
      mockSetActiveProvider.mockResolvedValue({
        success: true,
        providerId: 'myx',
      });

      const { getByTestId } = render(
        <PerpsProviderSelector testID="provider" />,
      );
      fireEvent.press(getByTestId('provider-badge'));

      const navigateCall = mockNavigate.mock.calls[0];
      const onSelectProvider = navigateCall[1].params.onSelectProvider;
      onSelectProvider('myx');

      await waitFor(() => {
        expect(mockSetActiveProvider).toHaveBeenCalledWith('myx');
      });
    });

    it('does not switch when selecting same provider via callback', async () => {
      mockUsePerpsProvider.mockReturnValue({
        activeProvider: 'hyperliquid',
        availableProviders: mockProviders,
        currentProviderInfo: mockProviders[0],
        hasMultipleProviders: true,
        setActiveProvider: mockSetActiveProvider,
      });

      const { getByTestId } = render(
        <PerpsProviderSelector testID="provider" />,
      );
      fireEvent.press(getByTestId('provider-badge'));

      const navigateCall = mockNavigate.mock.calls[0];
      const onSelectProvider = navigateCall[1].params.onSelectProvider;
      onSelectProvider('hyperliquid');

      await waitFor(() => {
        expect(mockSetActiveProvider).not.toHaveBeenCalled();
      });
    });
  });

  describe('Switch Warning', () => {
    it('shows warning when switching with open positions via callback', async () => {
      mockUsePerpsProvider.mockReturnValue({
        activeProvider: 'hyperliquid',
        availableProviders: mockProviders,
        currentProviderInfo: mockProviders[0],
        hasMultipleProviders: true,
        setActiveProvider: mockSetActiveProvider,
      });
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [
          {
            coin: 'BTC',
            sizeUsd: '1000',
            leverage: 10,
            entryPrice: '50000',
          } as never,
        ],
        isInitialLoading: false,
      });

      const { getByTestId } = render(
        <PerpsProviderSelector testID="provider" />,
      );
      fireEvent.press(getByTestId('provider-badge'));

      const navigateCall = mockNavigate.mock.calls[0];
      const onSelectProvider = navigateCall[1].params.onSelectProvider;
      await act(async () => {
        onSelectProvider('myx');
      });

      expect(getByTestId('provider-warning')).toBeTruthy();
    });

    it('does not switch when warning is cancelled', async () => {
      mockUsePerpsProvider.mockReturnValue({
        activeProvider: 'hyperliquid',
        availableProviders: mockProviders,
        currentProviderInfo: mockProviders[0],
        hasMultipleProviders: true,
        setActiveProvider: mockSetActiveProvider,
      });
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [
          {
            coin: 'BTC',
            sizeUsd: '1000',
            leverage: 10,
            entryPrice: '50000',
          } as never,
        ],
        isInitialLoading: false,
      });

      const { getByTestId } = render(
        <PerpsProviderSelector testID="provider" />,
      );
      fireEvent.press(getByTestId('provider-badge'));

      const navigateCall = mockNavigate.mock.calls[0];
      const onSelectProvider = navigateCall[1].params.onSelectProvider;
      await act(async () => {
        onSelectProvider('myx');
      });

      fireEvent.press(getByTestId('provider-warning-cancel'));

      await waitFor(() => {
        expect(mockSetActiveProvider).not.toHaveBeenCalled();
      });
    });

    it('switches provider when warning is confirmed', async () => {
      mockUsePerpsProvider.mockReturnValue({
        activeProvider: 'hyperliquid',
        availableProviders: mockProviders,
        currentProviderInfo: mockProviders[0],
        hasMultipleProviders: true,
        setActiveProvider: mockSetActiveProvider,
      });
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [
          {
            coin: 'BTC',
            sizeUsd: '1000',
            leverage: 10,
            entryPrice: '50000',
          } as never,
        ],
        isInitialLoading: false,
      });
      mockSetActiveProvider.mockResolvedValue({
        success: true,
        providerId: 'myx',
      });

      const { getByTestId } = render(
        <PerpsProviderSelector testID="provider" />,
      );
      fireEvent.press(getByTestId('provider-badge'));

      const navigateCall = mockNavigate.mock.calls[0];
      const onSelectProvider = navigateCall[1].params.onSelectProvider;
      await act(async () => {
        onSelectProvider('myx');
      });

      fireEvent.press(getByTestId('provider-warning-confirm'));

      await waitFor(() => {
        expect(mockSetActiveProvider).toHaveBeenCalledWith('myx');
      });
    });
  });
});
