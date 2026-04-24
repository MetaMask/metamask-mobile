import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { TokenWarningModal } from './index';
import { TokenWarningModalMode } from './constants';
import { MetaMetricsSwapsEventSource } from '@metamask/bridge-controller';
import { strings } from '../../../../../../locales/i18n';
import { PriceImpactModalType } from '../PriceImpactModal/constants';
import Routes from '../../../../../constants/navigation/Routes';
import { SecurityDataType } from '../../hooks/usePopularTokens';

jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const ReactModule = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: ReactModule.forwardRef(
        (props: { children: unknown }, _ref: unknown) => (
          <View testID="bottom-sheet">{props.children as React.ReactNode}</View>
        ),
      ),
    };
  },
);

jest.mock('../../../../../util/navigation/navUtils', () => ({
  useParams: jest.fn(),
}));

jest.mock('../../hooks/useLatestBalance', () => ({
  useLatestBalance: jest.fn().mockReturnValue(undefined),
}));

jest.mock('../../hooks/useBridgeConfirm', () => ({
  useBridgeConfirm: jest.fn(),
}));

jest.mock('../../hooks/useBridgeQuoteData', () => ({
  useBridgeQuoteData: jest.fn(),
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

const mockReplace = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ replace: mockReplace }),
}));

jest.mock(
  '../../../../../core/redux/slices/bridge/utils/hasMinimumRequiredVersion',
  () => ({
    hasMinimumRequiredVersion: jest.fn().mockReturnValue(true),
  }),
);

import { useParams } from '../../../../../util/navigation/navUtils';
import { useLatestBalance } from '../../hooks/useLatestBalance';
import { useBridgeConfirm } from '../../hooks/useBridgeConfirm';
import { useBridgeQuoteData } from '../../hooks/useBridgeQuoteData';
import { useSelector } from 'react-redux';
import {
  selectSourceToken,
  selectDestToken,
  selectBridgeFeatureFlags,
} from '../../../../../core/redux/slices/bridge';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { Hex } from '@metamask/utils';

const mockUseParams = useParams as jest.MockedFunction<typeof useParams>;
const mockUseLatestBalance = useLatestBalance as jest.MockedFunction<
  typeof useLatestBalance
>;
const mockUseBridgeConfirm = useBridgeConfirm as jest.MockedFunction<
  typeof useBridgeConfirm
>;
const mockUseBridgeQuoteData = useBridgeQuoteData as jest.MockedFunction<
  typeof useBridgeQuoteData
>;
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

const mockConfirmBridge = jest.fn();

const mockSourceToken = {
  address: '0xabc',
  decimals: 18,
  chainId: '0x1' as Hex,
  symbol: 'ETH',
  name: 'Ether',
  image: '',
};

const mockDestToken = {
  address: '0xdef',
  decimals: 18,
  chainId: '0x1' as Hex,
  symbol: 'SQUID',
  name: 'Squid',
  image: '',
};

const mockBridgeFeatureFlags = {
  priceImpactThreshold: { error: 0.25, warning: 0.05 },
};

const mockActiveQuote = {
  quote: {
    priceData: { priceImpact: '0.05' }, // below error threshold by default
  },
};

const mockFeatures = [
  {
    featureId: 'low_locked_liquidity',
    type: SecurityDataType.Warning,
    description: 'Low locked liquidity description',
  },
  {
    featureId: 'honeypot_risk',
    type: SecurityDataType.Warning,
    description: 'Honeypot risk description',
  },
];

const defaultWarningParams = {
  warningType: SecurityDataType.Warning as
    | SecurityDataType.Warning
    | SecurityDataType.Malicious,
  features: mockFeatures,
  mode: TokenWarningModalMode.Execution,
  location: MetaMetricsSwapsEventSource.MainView,
};

const renderModal = () =>
  renderWithProvider(<TokenWarningModal />, { state: {} });

describe('TokenWarningModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseParams.mockReturnValue(defaultWarningParams);
    mockUseLatestBalance.mockReturnValue(undefined);
    mockUseBridgeConfirm.mockReturnValue(mockConfirmBridge);
    mockUseBridgeQuoteData.mockReturnValue({
      activeQuote: mockActiveQuote,
    } as ReturnType<typeof useBridgeQuoteData>);
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectSourceToken) return mockSourceToken;
      if (selector === selectDestToken) return mockDestToken;
      if (selector === selectBridgeFeatureFlags) return mockBridgeFeatureFlags;
      return undefined;
    });
  });

  describe('rendering — Warning type', () => {
    it('shows the suspicious title', () => {
      const { getByText } = renderModal();
      expect(
        getByText(strings('bridge.token_warning_modal_suspicious_title')),
      ).toBeOnTheScreen();
    });

    it('shows the suspicious description with the dest token symbol', () => {
      const { getByText } = renderModal();
      expect(
        getByText(
          strings('bridge.token_warning_modal_suspicious_description', {
            symbol: 'SQUID',
          }),
        ),
      ).toBeOnTheScreen();
    });

    it('renders one row per feature with the suspicious title and description', () => {
      const { getAllByText, getByText } = renderModal();
      expect(
        getAllByText(
          strings('bridge.token_warning_modal_suspicious_feature_title'),
        ),
      ).toHaveLength(mockFeatures.length);
      expect(getByText('Low locked liquidity description')).toBeOnTheScreen();
      expect(getByText('Honeypot risk description')).toBeOnTheScreen();
    });

    it('uses the specific feature label when featureId is recognized', () => {
      mockUseParams.mockReturnValue({
        ...defaultWarningParams,
        features: [
          {
            featureId: 'INSUFFICIENT_LOCKED_LIQUIDITY',
            type: SecurityDataType.Warning,
            description: 'Low locked liquidity description',
          },
          {
            featureId: 'HONEYPOT',
            type: SecurityDataType.Warning,
            description: 'Honeypot risk description',
          },
        ],
      });
      const { getByText, queryByText } = renderModal();
      expect(
        getByText(
          strings(
            'security_trust.features.negative.insufficient_locked_liquidity',
          ),
        ),
      ).toBeOnTheScreen();
      expect(
        getByText(strings('security_trust.features.negative.honeypot')),
      ).toBeOnTheScreen();
      // Generic fallback should not be used
      expect(
        queryByText(
          strings('bridge.token_warning_modal_suspicious_feature_title'),
        ),
      ).toBeNull();
    });

    it('does not render any feature rows when features is empty', () => {
      mockUseParams.mockReturnValue({
        ...defaultWarningParams,
        features: [],
      });
      const { queryByText } = renderModal();
      expect(
        queryByText(
          strings('bridge.token_warning_modal_suspicious_feature_title'),
        ),
      ).toBeNull();
      expect(
        queryByText(
          strings('bridge.token_warning_modal_suspicious_description', {
            symbol: 'SQUID',
          }),
        ),
      ).toBeOnTheScreen();
    });
  });

  describe('rendering — Malicious type', () => {
    beforeEach(() => {
      mockUseParams.mockReturnValue({
        ...defaultWarningParams,
        warningType: SecurityDataType.Malicious,
      });
    });

    it('shows the malicious title', () => {
      const { getByText } = renderModal();
      expect(
        getByText(strings('bridge.token_warning_modal_malicious_title')),
      ).toBeOnTheScreen();
    });

    it('shows the malicious description with the dest token symbol', () => {
      const { getByText } = renderModal();
      expect(
        getByText(
          strings('bridge.token_warning_modal_malicious_description', {
            symbol: 'SQUID',
          }),
        ),
      ).toBeOnTheScreen();
    });

    it('renders feature rows with the malicious title', () => {
      const { getAllByText } = renderModal();
      expect(
        getAllByText(
          strings('bridge.token_warning_modal_malicious_feature_title'),
        ),
      ).toHaveLength(mockFeatures.length);
    });

    it('shows Continue anyway and Cancel (not Proceed) in Execution mode', () => {
      const { getByText, queryByText } = renderModal();
      expect(
        getByText(strings('bridge.token_warning_modal_continue_anyway')),
      ).toBeOnTheScreen();
      expect(getByText(strings('bridge.cancel'))).toBeOnTheScreen();
      expect(queryByText(strings('bridge.proceed'))).toBeNull();
    });

    it('calls confirmBridge when Continue anyway is pressed', async () => {
      const { getByTestId } = renderModal();
      fireEvent.press(getByTestId('footer-secondary-button'));

      await waitFor(() => {
        expect(mockConfirmBridge).toHaveBeenCalledTimes(1);
      });
    });

    it('does not call confirmBridge when Cancel is pressed', () => {
      const { getByTestId } = renderModal();
      fireEvent.press(getByTestId('footer-primary-button'));
      expect(mockConfirmBridge).not.toHaveBeenCalled();
    });
  });

  describe('rendering — Execution mode', () => {
    it('shows Proceed (secondary) and Cancel (primary) buttons', () => {
      const { getByText } = renderModal();
      expect(getByText(strings('bridge.proceed'))).toBeOnTheScreen();
      expect(getByText(strings('bridge.cancel'))).toBeOnTheScreen();
    });

    it('does not show the Got it button', () => {
      const { queryByText } = renderModal();
      expect(queryByText(strings('bridge.got_it'))).toBeNull();
    });
  });

  describe('rendering — Info mode', () => {
    it('shows only the Got it button', () => {
      mockUseParams.mockReturnValue({
        ...defaultWarningParams,
        mode: TokenWarningModalMode.Info,
      });

      const { getByText, queryByText } = renderModal();
      expect(getByText(strings('bridge.got_it'))).toBeOnTheScreen();
      expect(queryByText(strings('bridge.proceed'))).toBeNull();
      expect(queryByText(strings('bridge.cancel'))).toBeNull();
    });
  });

  describe('handleClose', () => {
    it('does not call confirmBridge when Cancel is pressed', () => {
      const { getByTestId } = renderModal();
      fireEvent.press(getByTestId('footer-primary-button'));
      expect(mockConfirmBridge).not.toHaveBeenCalled();
    });

    it('does not call confirmBridge when Got it is pressed in Info mode', () => {
      mockUseParams.mockReturnValue({
        ...defaultWarningParams,
        mode: TokenWarningModalMode.Info,
      });

      const { getByTestId } = renderModal();
      fireEvent.press(getByTestId('footer-primary-button'));
      expect(mockConfirmBridge).not.toHaveBeenCalled();
    });

    it('does not call confirmBridge when the header close button is pressed', () => {
      const { getByTestId } = renderModal();
      fireEvent.press(getByTestId('header-close-button'));
      expect(mockConfirmBridge).not.toHaveBeenCalled();
    });
  });

  describe('handleProceed', () => {
    it('calls confirmBridge when price impact is below threshold', async () => {
      const { getByTestId } = renderModal();
      fireEvent.press(getByTestId('footer-secondary-button'));

      await waitFor(() => {
        expect(mockConfirmBridge).toHaveBeenCalledTimes(1);
      });
    });

    it('navigates to MissingPriceModal when activeQuote has no priceImpact', async () => {
      mockUseBridgeQuoteData.mockReturnValue({
        activeQuote: {
          quote: { priceData: { priceImpact: undefined } },
        },
      } as unknown as ReturnType<typeof useBridgeQuoteData>);

      const { getByTestId } = renderModal();
      fireEvent.press(getByTestId('footer-secondary-button'));

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith(
          Routes.BRIDGE.MODALS.MISSING_PRICE_MODAL,
          {
            location: MetaMetricsSwapsEventSource.MainView,
          },
        );
      });
      expect(mockConfirmBridge).not.toHaveBeenCalled();
    });

    it('navigates to MissingPriceModal when price data is unavailable', async () => {
      mockUseBridgeQuoteData.mockReturnValue({
        activeQuote: {
          quote: { priceData: undefined },
        },
      } as unknown as ReturnType<typeof useBridgeQuoteData>);

      const { getByTestId } = renderModal();
      fireEvent.press(getByTestId('footer-secondary-button'));

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith(
          Routes.BRIDGE.MODALS.MISSING_PRICE_MODAL,
          {
            location: MetaMetricsSwapsEventSource.MainView,
          },
        );
      });
      expect(mockConfirmBridge).not.toHaveBeenCalled();
    });

    it('navigates to PriceImpactModal when price impact meets error threshold', async () => {
      mockUseBridgeQuoteData.mockReturnValue({
        activeQuote: {
          quote: { priceData: { priceImpact: '0.25' } }, // exactly at threshold
        },
      } as unknown as ReturnType<typeof useBridgeQuoteData>);

      const { getByTestId } = renderModal();
      fireEvent.press(getByTestId('footer-secondary-button'));

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith(
          Routes.BRIDGE.MODALS.PRICE_IMPACT_MODAL,
          {
            type: PriceImpactModalType.Execution,
            token: mockSourceToken,
            location: MetaMetricsSwapsEventSource.MainView,
          },
        );
      });
    });

    it('does not call confirmBridge when price impact exceeds threshold', async () => {
      mockUseBridgeQuoteData.mockReturnValue({
        activeQuote: {
          quote: { priceData: { priceImpact: '0.90' } },
        },
      } as unknown as ReturnType<typeof useBridgeQuoteData>);

      const { getByTestId } = renderModal();
      fireEvent.press(getByTestId('footer-secondary-button'));

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalled();
      });
      expect(mockConfirmBridge).not.toHaveBeenCalled();
    });

    it('uses the feature flag threshold over the AppConstants fallback', async () => {
      // Feature flag sets error threshold to 0.50 — a 0.40 impact should NOT trigger the modal
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectSourceToken) return mockSourceToken;
        if (selector === selectDestToken) return mockDestToken;
        if (selector === selectBridgeFeatureFlags)
          return { priceImpactThreshold: { error: 0.5, warning: 0.05 } };
        return undefined;
      });
      mockUseBridgeQuoteData.mockReturnValue({
        activeQuote: {
          quote: { priceData: { priceImpact: '0.40' } },
        },
      } as unknown as ReturnType<typeof useBridgeQuoteData>);

      const { getByTestId } = renderModal();
      fireEvent.press(getByTestId('footer-secondary-button'));

      await waitFor(() => {
        expect(mockConfirmBridge).toHaveBeenCalledTimes(1);
      });
      expect(mockReplace).not.toHaveBeenCalled();
    });

    it('Proceed button is disabled while loading', async () => {
      let resolveConfirm!: () => void;
      mockConfirmBridge.mockReturnValue(
        new Promise<void>((resolve) => {
          resolveConfirm = resolve;
        }),
      );

      const { getByTestId } = renderModal();
      fireEvent.press(getByTestId('footer-secondary-button'));

      await waitFor(() => {
        expect(
          getByTestId('footer-secondary-button').props.accessibilityState
            .disabled,
        ).toBe(true);
      });

      resolveConfirm();
    });
  });
});
