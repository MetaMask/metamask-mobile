import { fireEvent, waitFor } from '@testing-library/react-native';
import React from 'react';
import { strings } from '../../../../../../locales/i18n';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import {
  PerpsAmountDisplaySelectorsIDs,
  PerpsClosePositionBottomSheetSelectorsIDs,
} from '../../Perps.testIds';
import {
  defaultMinimumOrderAmountMock,
  defaultPerpsClosePositionMock,
  defaultPerpsClosePositionValidationMock,
  defaultPerpsEventTrackingMock,
  defaultPerpsLivePricesMock,
  defaultPerpsOrderFeesMock,
  defaultPerpsPositionMock,
  defaultPerpsRewardsMock,
  defaultPerpsTopOfBookMock,
} from '../../__mocks__/perpsHooksMocks';
import { createPerpsStateMock } from '../../__mocks__/perpsStateMock';
import PerpsClosePositionBottomSheet from './PerpsClosePositionBottomSheet';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockSheetClose = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
  useRoute: jest.fn(),
  useIsFocused: jest.fn(),
}));
jest.mock('../../../../../util/haptics');
jest.mock('../../services/PerpsCacheInvalidator', () => ({
  PerpsCacheInvalidator: { invalidate: jest.fn() },
}));
jest.mock('react-native/Libraries/Linking/Linking', () => ({
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  openURL: jest.fn(),
  canOpenURL: jest.fn().mockResolvedValue(true),
  getInitialURL: jest.fn().mockResolvedValue(''),
  sendIntent: jest.fn(),
}));

jest.mock('../../hooks', () => ({
  useMinimumOrderAmount: jest.fn(),
  usePerpsOrderFees: jest.fn(),
  usePerpsClosePositionValidation: jest.fn(),
  usePerpsClosePosition: jest.fn(),
  usePerpsMarketData: jest.fn(),
  usePerpsToasts: jest.fn(),
  usePerpsRewards: jest.fn(),
}));

jest.mock('../../hooks/stream', () => ({
  usePerpsLivePositions: jest.fn(),
  usePerpsLivePrices: jest.fn(),
  usePerpsTopOfBook: jest.fn(),
}));

jest.mock('../../hooks/usePerpsEventTracking', () => ({
  usePerpsEventTracking: jest.fn(),
}));

jest.mock('../../selectors/featureFlags', () => ({
  ...jest.requireActual('../../selectors/featureFlags'),
  selectPerpsClosePositionLimitOrderEnabledFlag: jest.fn(() => true),
}));

jest.mock('../../../../hooks/useAnalytics/useAnalytics');
// Pressable stub so tests can drive a keypad entry through the real onChange
// wiring without depending on the real keypad layout.
const MOCK_KEYPAD_VALUE = '3100';
jest.mock('../../../../Base/Keypad', () => {
  const ReactActual = jest.requireActual('react');
  const { TouchableOpacity: Touchable } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      onChange,
    }: {
      onChange: (input: { value: string; valueAsNumber: number }) => void;
    }) =>
      ReactActual.createElement(Touchable, {
        testID: 'mock-keypad',
        onPress: () => onChange({ value: '3100', valueAsNumber: 3100 }),
      }),
  };
});
jest.mock('../../components/PerpsTokenLogo', () => 'PerpsTokenLogo');

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    ...actual,
    Slider: 'Slider',
    BottomSheet: ReactActual.forwardRef(
      (
        { children, testID }: { children?: React.ReactNode; testID?: string },
        ref: React.Ref<{ onCloseBottomSheet: (cb?: () => void) => void }>,
      ) => {
        ReactActual.useImperativeHandle(ref, () => ({
          onCloseBottomSheet: (cb?: () => void) => {
            mockSheetClose();
            cb?.();
          },
        }));
        return ReactActual.createElement(View, { testID }, children);
      },
    ),
  };
});

const STATE_MOCK = createPerpsStateMock();

const defaultPerpsToastsMock = {
  showToast: jest.fn(),
  PerpsToastOptions: {
    positionManagement: {
      closePosition: {
        positionAlreadyClosed: { label: 'already-closed' },
        limitClose: {
          partial: { switchToMarketOrderMissingLimitPrice: {} },
        },
      },
    },
  },
};

describe('PerpsClosePositionBottomSheet', () => {
  const useNavigationMock = jest.mocked(
    jest.requireMock('@react-navigation/native').useNavigation,
  );
  const useRouteMock = jest.mocked(
    jest.requireMock('@react-navigation/native').useRoute,
  );
  const useIsFocusedMock = jest.mocked(
    jest.requireMock('@react-navigation/native').useIsFocused,
  );
  const usePerpsLivePositionsMock = jest.mocked(
    jest.requireMock('../../hooks/stream').usePerpsLivePositions,
  );
  const usePerpsLivePricesMock = jest.mocked(
    jest.requireMock('../../hooks/stream').usePerpsLivePrices,
  );
  const usePerpsTopOfBookMock = jest.mocked(
    jest.requireMock('../../hooks/stream').usePerpsTopOfBook,
  );
  const usePerpsOrderFeesMock = jest.mocked(
    jest.requireMock('../../hooks').usePerpsOrderFees,
  );
  const usePerpsClosePositionValidationMock = jest.mocked(
    jest.requireMock('../../hooks').usePerpsClosePositionValidation,
  );
  const usePerpsClosePositionMock = jest.mocked(
    jest.requireMock('../../hooks').usePerpsClosePosition,
  );
  const usePerpsEventTrackingMock = jest.mocked(
    jest.requireMock('../../hooks/usePerpsEventTracking').usePerpsEventTracking,
  );
  const useMinimumOrderAmountMock = jest.mocked(
    jest.requireMock('../../hooks').useMinimumOrderAmount,
  );
  const usePerpsMarketDataMock = jest.mocked(
    jest.requireMock('../../hooks').usePerpsMarketData,
  );
  const usePerpsToastsMock = jest.mocked(
    jest.requireMock('../../hooks').usePerpsToasts,
  );
  const usePerpsRewardsMock = jest.mocked(
    jest.requireMock('../../hooks').usePerpsRewards,
  );

  beforeEach(() => {
    jest.clearAllMocks();

    useNavigationMock.mockReturnValue({
      goBack: mockGoBack,
      navigate: mockNavigate,
      addListener: jest.fn(() => jest.fn()),
    });
    useIsFocusedMock.mockReturnValue(true);
    useRouteMock.mockReturnValue({
      params: { position: defaultPerpsPositionMock },
    });

    usePerpsLivePositionsMock.mockReturnValue({
      positions: [defaultPerpsPositionMock],
      isInitialLoading: false,
    });
    usePerpsLivePricesMock.mockReturnValue(defaultPerpsLivePricesMock);
    usePerpsTopOfBookMock.mockReturnValue(defaultPerpsTopOfBookMock);
    usePerpsOrderFeesMock.mockReturnValue(defaultPerpsOrderFeesMock);
    usePerpsClosePositionValidationMock.mockReturnValue(
      defaultPerpsClosePositionValidationMock,
    );
    usePerpsClosePositionMock.mockReturnValue(defaultPerpsClosePositionMock);
    usePerpsEventTrackingMock.mockImplementation(
      (options?: {
        eventName?: string;
        properties?: Record<string, unknown>;
      }) => {
        if (options?.eventName) {
          defaultPerpsEventTrackingMock.track(
            options.eventName,
            options.properties || {},
          );
        }
        return defaultPerpsEventTrackingMock;
      },
    );
    useMinimumOrderAmountMock.mockReturnValue(defaultMinimumOrderAmountMock);
    usePerpsMarketDataMock.mockReturnValue({
      marketData: { szDecimals: 4 },
      isLoading: false,
      error: null,
    });
    usePerpsToastsMock.mockReturnValue(defaultPerpsToastsMock);
    usePerpsRewardsMock.mockReturnValue(defaultPerpsRewardsMock);
  });

  const renderSheet = () =>
    renderWithProvider(<PerpsClosePositionBottomSheet />, {
      state: STATE_MOCK,
    });

  describe('rendering', () => {
    it('renders the sheet with the position summary in the header', () => {
      const { getByTestId } = renderSheet();

      expect(
        getByTestId(PerpsClosePositionBottomSheetSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();
      expect(
        getByTestId(PerpsClosePositionBottomSheetSelectorsIDs.HEADER_TITLE),
      ).toHaveTextContent(
        `${strings('perps.close_position.close')} ${strings('perps.market.long')} ETH 3x`,
      );
    });

    it('labels a short position in the header', () => {
      useRouteMock.mockReturnValue({
        params: {
          position: { ...defaultPerpsPositionMock, size: '-1.5' },
        },
      });
      usePerpsLivePositionsMock.mockReturnValue({
        positions: [{ ...defaultPerpsPositionMock, size: '-1.5' }],
        isInitialLoading: false,
      });

      const { getByTestId } = renderSheet();

      expect(
        getByTestId(PerpsClosePositionBottomSheetSelectorsIDs.HEADER_TITLE),
      ).toHaveTextContent(
        `${strings('perps.close_position.close')} ${strings('perps.market.short')} ETH 3x`,
      );
    });

    it('renders margin, fees and total rows', () => {
      const { getByTestId, getByText } = renderSheet();

      expect(
        getByText(strings('perps.close_position.margin')),
      ).toBeOnTheScreen();
      expect(getByText(strings('perps.close_position.fees'))).toBeOnTheScreen();
      expect(
        getByText(strings('perps.close_position.total_inc_pnl')),
      ).toBeOnTheScreen();
      expect(
        getByTestId(PerpsClosePositionBottomSheetSelectorsIDs.MARGIN_VALUE),
      ).toBeOnTheScreen();
      expect(
        getByTestId(PerpsClosePositionBottomSheetSelectorsIDs.TOTAL_VALUE),
      ).toBeOnTheScreen();
    });

    it('shows a gain in the net P&L delta alongside the total', () => {
      const { getByTestId } = renderSheet();

      expect(
        getByTestId(PerpsClosePositionBottomSheetSelectorsIDs.TOTAL_PNL),
      ).toHaveTextContent('(+$150)');
    });

    it('shows a loss in the net P&L delta alongside the total', () => {
      const losingPosition = {
        ...defaultPerpsPositionMock,
        unrealizedPnl: '-150.00',
      };
      useRouteMock.mockReturnValue({ params: { position: losingPosition } });
      usePerpsLivePositionsMock.mockReturnValue({
        positions: [losingPosition],
        isInitialLoading: false,
      });

      const { getByTestId } = renderSheet();

      expect(
        getByTestId(PerpsClosePositionBottomSheetSelectorsIDs.TOTAL_PNL),
      ).toHaveTextContent('(-$150)');
    });

    it('renders the fiat/token display toggle', () => {
      const { getByTestId } = renderSheet();

      expect(
        getByTestId(
          PerpsClosePositionBottomSheetSelectorsIDs.AMOUNT_DISPLAY_TOGGLE,
        ),
      ).toBeOnTheScreen();
    });

    it('swaps the primary amount between fiat and token when toggled', () => {
      const { getByTestId } = renderSheet();

      const amount = () =>
        getByTestId(PerpsAmountDisplaySelectorsIDs.AMOUNT_LABEL);
      const fiatFirst = amount().props.children;

      fireEvent.press(
        getByTestId(
          PerpsClosePositionBottomSheetSelectorsIDs.AMOUNT_DISPLAY_TOGGLE,
        ),
      );
      const tokenFirst = amount().props.children;

      expect(tokenFirst).not.toBe(fiatFirst);
      expect(String(tokenFirst)).toContain('ETH');

      fireEvent.press(
        getByTestId(
          PerpsClosePositionBottomSheetSelectorsIDs.AMOUNT_DISPLAY_TOGGLE,
        ),
      );
      expect(amount().props.children).toBe(fiatFirst);
    });

    it('renders the order type toggle when the limit order flag is enabled', () => {
      const { getByTestId } = renderSheet();

      expect(
        getByTestId(
          PerpsClosePositionBottomSheetSelectorsIDs.ORDER_TYPE_MARKET,
        ),
      ).toBeOnTheScreen();
      expect(
        getByTestId(PerpsClosePositionBottomSheetSelectorsIDs.ORDER_TYPE_LIMIT),
      ).toBeOnTheScreen();
    });
  });

  describe('order type', () => {
    it('does not show the limit price field for a market close', () => {
      const { queryByTestId } = renderSheet();

      expect(
        queryByTestId(
          PerpsClosePositionBottomSheetSelectorsIDs.LIMIT_PRICE_INPUT,
        ),
      ).toBeNull();
    });

    it('reveals the limit price field when limit is selected', () => {
      const { getByTestId } = renderSheet();

      fireEvent.press(
        getByTestId(PerpsClosePositionBottomSheetSelectorsIDs.ORDER_TYPE_LIMIT),
      );

      expect(
        getByTestId(
          PerpsClosePositionBottomSheetSelectorsIDs.LIMIT_PRICE_INPUT,
        ),
      ).toBeOnTheScreen();
    });

    it('hides the limit price field again when switching back to market', () => {
      const { getByTestId, queryByTestId } = renderSheet();

      fireEvent.press(
        getByTestId(PerpsClosePositionBottomSheetSelectorsIDs.ORDER_TYPE_LIMIT),
      );
      fireEvent.press(
        getByTestId(
          PerpsClosePositionBottomSheetSelectorsIDs.ORDER_TYPE_MARKET,
        ),
      );

      expect(
        queryByTestId(
          PerpsClosePositionBottomSheetSelectorsIDs.LIMIT_PRICE_INPUT,
        ),
      ).toBeNull();
    });
  });

  describe('confirm button', () => {
    it('is enabled for a valid market close', () => {
      const { getByTestId } = renderSheet();

      expect(
        getByTestId(PerpsClosePositionBottomSheetSelectorsIDs.CONFIRM_BUTTON),
      ).toBeEnabled();
    });

    it('is disabled while the limit price is empty', () => {
      const { getByTestId } = renderSheet();

      fireEvent.press(
        getByTestId(PerpsClosePositionBottomSheetSelectorsIDs.ORDER_TYPE_LIMIT),
      );

      expect(
        getByTestId(PerpsClosePositionBottomSheetSelectorsIDs.CONFIRM_BUTTON),
      ).toBeDisabled();
    });

    it('submits the close and dismisses the sheet', async () => {
      const { getByTestId } = renderSheet();

      fireEvent.press(
        getByTestId(PerpsClosePositionBottomSheetSelectorsIDs.CONFIRM_BUTTON),
      );

      await waitFor(() => {
        expect(
          defaultPerpsClosePositionMock.handleClosePosition,
        ).toHaveBeenCalled();
      });
      expect(mockSheetClose).toHaveBeenCalled();
    });

    it('enables the CTA and submits a limit close once a price is entered', async () => {
      const { getByTestId } = renderSheet();

      fireEvent.press(
        getByTestId(PerpsClosePositionBottomSheetSelectorsIDs.ORDER_TYPE_LIMIT),
      );
      fireEvent.press(getByTestId('mock-keypad'));

      const confirmButton = getByTestId(
        PerpsClosePositionBottomSheetSelectorsIDs.CONFIRM_BUTTON,
      );
      expect(confirmButton).toBeEnabled();

      fireEvent.press(confirmButton);

      await waitFor(() => {
        expect(
          defaultPerpsClosePositionMock.handleClosePosition,
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            orderType: 'limit',
            limitPrice: MOCK_KEYPAD_VALUE,
          }),
        );
      });
    });

    it('submits a market order type for a market close', async () => {
      const { getByTestId } = renderSheet();

      fireEvent.press(
        getByTestId(PerpsClosePositionBottomSheetSelectorsIDs.CONFIRM_BUTTON),
      );

      await waitFor(() => {
        expect(
          defaultPerpsClosePositionMock.handleClosePosition,
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            orderType: 'market',
            limitPrice: undefined,
          }),
        );
      });
    });
  });

  describe('tooltips', () => {
    it('opens the fees tooltip', () => {
      const { getByTestId } = renderSheet();

      fireEvent.press(
        getByTestId(
          PerpsClosePositionBottomSheetSelectorsIDs.FEES_TOOLTIP_BUTTON,
        ),
      );

      expect(mockNavigate).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({ contentKey: 'closing_fees' }),
        }),
      );
    });

    it('opens the total tooltip', () => {
      const { getByTestId } = renderSheet();

      fireEvent.press(
        getByTestId(
          PerpsClosePositionBottomSheetSelectorsIDs.TOTAL_TOOLTIP_BUTTON,
        ),
      );

      expect(mockNavigate).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            contentKey: 'close_position_you_receive',
          }),
        }),
      );
    });
  });

  describe('feature flag', () => {
    it('hides the order type toggle when the limit order flag is disabled', () => {
      jest
        .requireMock('../../selectors/featureFlags')
        .selectPerpsClosePositionLimitOrderEnabledFlag.mockReturnValue(false);

      const { queryByTestId } = renderSheet();

      expect(
        queryByTestId(
          PerpsClosePositionBottomSheetSelectorsIDs.ORDER_TYPE_CONTROL,
        ),
      ).toBeNull();
    });
  });
});
