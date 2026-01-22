import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import PerpsSelectProviderView from './PerpsSelectProviderView';
import type {
  PerpsProviderInfo,
  PerpsProviderType,
} from '../../controllers/types';

const mockGoBack = jest.fn();
const mockOnSelectProvider = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
  }),
  useRoute: () => ({
    params: {
      providers: [
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
      ] as PerpsProviderInfo[],
      activeProvider: 'hyperliquid' as PerpsProviderType,
      onSelectProvider: mockOnSelectProvider,
    },
  }),
}));

jest.mock('../../../../../component-library/hooks', () => ({
  useStyles: () => ({
    styles: {
      sheetContainer: {},
      providerRow: {},
      providerRowSelected: {},
      providerIcon: {},
      providerInfo: {},
      providerName: {},
      providerDetails: {},
      providerChain: {},
      checkmark: {},
    },
  }),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key) => {
    const translations: Record<string, string> = {
      'perps.provider_selector.title': 'Select provider',
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

jest.mock('../../../../../component-library/components/Icons/Icon', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ testID }: { testID?: string }) => <View testID={testID} />,
    IconName: {
      Check: 'Check',
    },
    IconSize: { Md: 'md' },
    IconColor: { Primary: 'Primary' },
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

describe('PerpsSelectProviderView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders provider selection sheet', () => {
    const { getByText } = render(<PerpsSelectProviderView />);
    expect(getByText('HyperLiquid')).toBeTruthy();
    expect(getByText('MYX')).toBeTruthy();
  });

  it('calls onSelectProvider and navigates back on provider selection', async () => {
    const { getByText } = render(<PerpsSelectProviderView />);
    fireEvent.press(getByText('MYX'));

    await waitFor(() => {
      expect(mockOnSelectProvider).toHaveBeenCalledWith('myx');
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
  });

  it('navigates back on close', async () => {
    const { getByText } = render(<PerpsSelectProviderView />);
    fireEvent.press(getByText('HyperLiquid'));

    await waitFor(() => {
      expect(mockGoBack).toHaveBeenCalled();
    });
  });
});
