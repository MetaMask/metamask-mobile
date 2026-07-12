import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { brandColor, darkTheme } from '@metamask/design-tokens';
import { renderScreen } from '../../../../../../util/test/renderWithProvider';
import { PayWithModal } from './pay-with-modal';
import Routes from '../../../../../../constants/navigation/Routes';
import { AppThemeKey } from '../../../../../../util/theme/models';

const MOCK_ELEVATED_SURFACE_COLOR = '#0d0d0f';
const mockCapturedBottomSheetStyle: {
  current: StyleProp<ViewStyle> | undefined;
} = { current: undefined };

let mockIsPureBlackEnabled = false;

jest.mock('../../send/asset', () => ({
  Asset: () => null,
}));

jest.mock('../../../../../../util/theme/themeUtils', () => ({
  get isPureBlackEnabled() {
    return mockIsPureBlackEnabled;
  },
  getElevatedSurfaceColor: jest.fn(() => MOCK_ELEVATED_SURFACE_COLOR),
}));

jest.mock(
  '../../../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const ReactLib = jest.requireActual('react');
    const { View: MockView } = jest.requireActual('react-native');

    return ReactLib.forwardRef(
      (
        {
          children,
          style,
        }: {
          children: React.ReactNode;
          style?: StyleProp<ViewStyle>;
        },
        ref: React.Ref<{
          onOpenBottomSheet: () => void;
          onCloseBottomSheet: () => void;
        }>,
      ) => {
        mockCapturedBottomSheetStyle.current = style;
        ReactLib.useImperativeHandle(ref, () => ({
          onOpenBottomSheet: jest.fn(),
          onCloseBottomSheet: jest.fn(),
        }));
        return <MockView testID="mock-pay-with-bottom-sheet">{children}</MockView>;
      },
    );
  },
);

jest.mock('../../../hooks/pay/useTransactionPayToken', () => ({
  useTransactionPayToken: () => ({
    payToken: { address: '0x0', chainId: '0x1' },
    setPayToken: jest.fn(),
  }),
}));

jest.mock('../../../hooks/pay/useTransactionPayData', () => ({
  useTransactionPayFiatPayment: () => undefined,
  useTransactionPayRequiredTokens: () => [],
}));

jest.mock('../../../hooks/pay/useTransactionPayWithdraw', () => ({
  useTransactionPayWithdraw: () => ({
    isWithdraw: false,
    canSelectWithdrawToken: false,
  }),
}));

jest.mock('../../../hooks/pay/useWithdrawTokenFilter', () => ({
  useWithdrawTokenFilter: () => (tokens: unknown[]) => tokens,
}));

jest.mock('../../../hooks/transactions/useTransactionMetadataRequest', () => ({
  useTransactionMetadataRequest: () => ({
    id: 'tx-1',
    chainId: '0x1',
    type: 'simpleSend',
  }),
}));

jest.mock('../../../hooks/pay/usePayWithNoFeeToken', () => ({
  usePayWithNoFeeToken: () => ({
    renderNoFeeTag: jest.fn(() => null),
  }),
}));

jest.mock('../../../../../UI/Earn/hooks/useMusdConversionTokens', () => ({
  useMusdConversionTokens: () => ({
    filterAllowedTokens: (tokens: unknown[]) => tokens,
  }),
}));

jest.mock('../../../../../UI/Earn/hooks/useMusdPaymentToken', () => ({
  useMusdPaymentToken: () => ({
    onPaymentTokenChange: jest.fn(),
  }),
}));

jest.mock('../../../../../UI/Perps/hooks/usePerpsPaymentToken', () => ({
  usePerpsPaymentToken: () => ({
    onPaymentTokenChange: jest.fn(),
  }),
}));

jest.mock('../../../../../UI/Perps/hooks/usePerpsBalanceTokenFilter', () => ({
  usePerpsBalanceTokenFilter: () => (tokens: unknown[]) => tokens,
}));

jest.mock('../../../../../UI/Predict/hooks/usePredictPaymentToken', () => ({
  usePredictPaymentToken: () => ({
    onPaymentTokenChange: jest.fn(),
    resetSelectedPaymentToken: jest.fn(),
  }),
}));

jest.mock('../../../../../UI/Predict/hooks/usePredictBalanceTokenFilter', () => ({
  usePredictBalanceTokenFilter: () => (tokens: unknown[]) => tokens,
}));

jest.mock('../../../hooks/tokens/useEnsurePayToken', () => ({
  useEnsurePayToken: () => jest.fn(),
}));

jest.mock('../../../hooks/send/useAccountTokens', () => ({
  useAccountTokens: () => [],
}));

jest.mock('../../../hooks/send/metrics/useAssetSelectionMetrics', () => ({
  useAssetSelectionMetrics: () => ({
    captureAssetSelected: jest.fn(),
    setAssetListSize: jest.fn(),
    setNoneAssetFilterMethod: jest.fn(),
    setSearchAssetFilterMethod: jest.fn(),
  }),
}));

const darkTestTheme = {
  colors: darkTheme.colors,
  themeAppearance: AppThemeKey.dark,
  typography: darkTheme.typography,
  shadows: darkTheme.shadows,
  brandColors: brandColor,
};

describe('PayWithModal pure black surface', () => {
  beforeEach(() => {
    mockIsPureBlackEnabled = false;
    mockCapturedBottomSheetStyle.current = undefined;
  });

  it('passes elevated surface background to legacy BottomSheet in pure black dark mode', () => {
    mockIsPureBlackEnabled = true;

    renderScreen(
      PayWithModal,
      { name: Routes.CONFIRMATION_PAY_WITH_MODAL },
      {
        theme: darkTestTheme,
      },
    );

    expect(mockCapturedBottomSheetStyle.current).toEqual({
      backgroundColor: MOCK_ELEVATED_SURFACE_COLOR,
    });
  });

  it('does not override BottomSheet surface when pure black preview is off', () => {
    mockIsPureBlackEnabled = false;

    renderScreen(
      PayWithModal,
      { name: Routes.CONFIRMATION_PAY_WITH_MODAL },
      {
        theme: darkTestTheme,
      },
    );

    expect(mockCapturedBottomSheetStyle.current).toBeUndefined();
  });
});
