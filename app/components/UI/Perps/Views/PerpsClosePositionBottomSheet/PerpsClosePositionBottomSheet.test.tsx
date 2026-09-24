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
import { resetLastCloseOrderType } from '../../hooks/usePerpsClosePositionForm';
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

jest.mock('../../hooks/usePerpsClosePosition', () => ({
  usePerpsCloseInFlight: jest.fn(() => false),
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
let mockKeypadValue = MOCK_KEYPAD_VALUE;
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
        onPress: () =>
          onChange({
            value: mockKeypadValue,
            valueAsNumber: Number(mockKeypadValue),
          }),
      }),
  };
});
jest.mock('../../components/PerpsTokenLogo', () => 'PerpsTokenLogo');
jest.mock(
  '../../components/LivePriceDisplay/LivePriceHeader',
  () => 'LivePriceHeader',
);

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
    resetLastCloseOrderType();

    // clearAllMocks leaves implementations in place, so a test that turns the
    // limit-order flag off would otherwise disable it for every test after it.
    jest
      .requireMock('../../selectors/featureFlags')
      .selectPerpsClosePositionLimitOrderEnabledFlag.mockReturnValue(true);

    mockKeypadValue = MOCK_KEYPAD_VALUE;

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

  afterEach(() => {
    resetLastCloseOrderType();
  });

  const renderSheet = () =>
    renderWithProvider(<PerpsClosePositionBottomSheet />, {
      state: STATE_MOCK,
    });

  /** Taps the header control, which swaps between market and limit. */
  const toggleOrderType = (utils: ReturnType<typeof renderSheet>) => {
    fireEvent.press(
      utils.getByTestId(
        PerpsClosePositionBottomSheetSelectorsIDs.ORDER_TYPE_BUTTON,
      ),
    );
  };

  describe('rendering', () => {
    it('renders the sheet with the position summary in the header', () => {
      const { getByTestId } = renderSheet();

      expect(
        getByTestId(PerpsClosePositionBottomSheetSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();
      expect(
        getByTestId(PerpsClosePositionBottomSheetSelectorsIDs.HEADER_TITLE),
      ).toHaveTextContent(
        strings('perps.close_position.sheet_title_long', {
          asset: 'ETH',
        }),
      );
      expect(
        getByTestId(PerpsClosePositionBottomSheetSelectorsIDs.HEADER_LEVERAGE),
      ).toHaveTextContent('3x');
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
        strings('perps.close_position.sheet_title_short', {
          asset: 'ETH',
        }),
      );
    });

    it('renders margin and total rows without a separate fees row', () => {
      const { getByTestId, getByText, queryByText } = renderSheet();

      expect(
        getByText(strings('perps.close_position.margin')),
      ).toBeOnTheScreen();
      expect(
        getByTestId(PerpsClosePositionBottomSheetSelectorsIDs.MARGIN_MODE_TAG),
      ).toHaveTextContent(strings('perps.margin_mode.isolated_title'));
      expect(queryByText(strings('perps.close_position.fees'))).toBeNull();
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
          PerpsClosePositionBottomSheetSelectorsIDs.ORDER_TYPE_BUTTON,
        ),
      ).toBeOnTheScreen();
      expect(getByTestId('perps-swap-icon')).toBeOnTheScreen();
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
      const utils = renderSheet();
      const { getByTestId } = utils;

      toggleOrderType(utils);

      expect(
        getByTestId(
          PerpsClosePositionBottomSheetSelectorsIDs.LIMIT_PRICE_INPUT,
        ),
      ).toBeOnTheScreen();
    });

    it('opens the limit price keypad as the limit default', () => {
      const utils = renderSheet();

      toggleOrderType(utils);

      expect(utils.getByTestId('mock-keypad')).toBeOnTheScreen();
      expect(
        utils.getByTestId(
          PerpsClosePositionBottomSheetSelectorsIDs.LIMIT_PRESET_MID,
        ),
      ).toBeOnTheScreen();
      expect(
        utils.getByTestId(
          PerpsClosePositionBottomSheetSelectorsIDs.LIMIT_PRESET_TOP_OF_BOOK,
        ),
      ).toBeOnTheScreen();
      expect(
        utils.queryByTestId(
          PerpsClosePositionBottomSheetSelectorsIDs.CONFIRM_BUTTON,
        ),
      ).toBeNull();
    });

    it('does not show the amount cursor while the limit price keypad is open', () => {
      const utils = renderSheet();

      toggleOrderType(utils);

      expect(utils.queryByTestId('cursor')).toBeNull();
    });

    it('shows a blinking cursor on the limit price while the keypad is open', () => {
      const utils = renderSheet();

      toggleOrderType(utils);

      expect(
        utils.getByTestId(
          PerpsClosePositionBottomSheetSelectorsIDs.LIMIT_PRICE_CURSOR,
        ),
      ).toBeOnTheScreen();
    });

    it('places the limit price cursor before the placeholder when empty', () => {
      const utils = renderSheet();

      toggleOrderType(utils);

      const input = utils.getByTestId(
        PerpsClosePositionBottomSheetSelectorsIDs.LIMIT_PRICE_INPUT,
      );
      const cursor = utils.getByTestId(
        PerpsClosePositionBottomSheetSelectorsIDs.LIMIT_PRICE_CURSOR,
      );
      const siblings = input.parent?.children ?? [];

      expect(siblings.indexOf(cursor)).toBeLessThan(siblings.indexOf(input));
    });

    it('keeps the limit price cursor visible after digits are entered', () => {
      const utils = renderSheet();

      toggleOrderType(utils);
      fireEvent.press(utils.getByTestId('mock-keypad'));

      expect(
        utils.getByTestId(
          PerpsClosePositionBottomSheetSelectorsIDs.LIMIT_PRICE_INPUT,
        ),
      ).toHaveTextContent('3,100');
      expect(
        utils.getByTestId(
          PerpsClosePositionBottomSheetSelectorsIDs.LIMIT_PRICE_CURSOR,
        ),
      ).toBeOnTheScreen();
    });

    it('hides the limit price cursor when the close size slider is showing', () => {
      const utils = renderSheet();

      toggleOrderType(utils);
      fireEvent.press(
        utils.getByTestId(PerpsAmountDisplaySelectorsIDs.CONTAINER),
      );

      expect(
        utils.queryByTestId(
          PerpsClosePositionBottomSheetSelectorsIDs.LIMIT_PRICE_CURSOR,
        ),
      ).toBeNull();
    });

    it('returns to the market default when toggling back from limit', () => {
      const utils = renderSheet();
      const { getByTestId, queryByTestId, UNSAFE_queryAllByType } = utils;

      toggleOrderType(utils);
      toggleOrderType(utils);

      expect(queryByTestId('mock-keypad')).toBeNull();
      expect(
        getByTestId(PerpsClosePositionBottomSheetSelectorsIDs.CONFIRM_BUTTON),
      ).toBeOnTheScreen();
      expect(
        UNSAFE_queryAllByType('Slider' as unknown as React.ComponentType),
      ).toHaveLength(1);
    });

    it('shows a muted zero in the limit price field until a price is entered', () => {
      const utils = renderSheet();

      toggleOrderType(utils);

      expect(
        utils.getByTestId(
          PerpsClosePositionBottomSheetSelectorsIDs.LIMIT_PRICE_INPUT,
        ),
      ).toHaveTextContent('0.00');
    });

    it('prompts to set a price instead of showing a zero limit after Done', () => {
      const utils = renderSheet();

      toggleOrderType(utils);
      fireEvent.press(utils.getByText(strings('perps.deposit.done_button')));

      expect(
        utils.getByTestId(
          PerpsClosePositionBottomSheetSelectorsIDs.LIMIT_PRICE_INPUT,
        ),
      ).toHaveTextContent(strings('perps.order.set_price'));
    });

    it('explains the disabled Close button while the limit price is unset', () => {
      const utils = renderSheet();

      toggleOrderType(utils);
      fireEvent.press(utils.getByText(strings('perps.deposit.done_button')));

      expect(
        utils.getByText(
          strings('perps.order.validation.please_set_a_limit_price'),
        ),
      ).toBeOnTheScreen();
    });

    it('shows the review state when the limit order flag is off despite a remembered limit type', () => {
      // Session memory says limit, but the flag forces effectiveOrderType to
      // market. Nothing may keep the keypad up over the slider and CTA.
      const firstOpen = renderSheet();
      toggleOrderType(firstOpen);
      firstOpen.unmount();

      jest
        .requireMock('../../selectors/featureFlags')
        .selectPerpsClosePositionLimitOrderEnabledFlag.mockReturnValue(false);

      const utils = renderSheet();

      expect(utils.queryByTestId('mock-keypad')).toBeNull();
      expect(
        utils.queryByTestId(
          PerpsClosePositionBottomSheetSelectorsIDs.LIMIT_PRICE_ROW,
        ),
      ).toBeNull();
      expect(
        utils.getByTestId(
          PerpsClosePositionBottomSheetSelectorsIDs.CONFIRM_BUTTON,
        ),
      ).toBeOnTheScreen();
    });

    it('reopens the limit price keypad when the limit price row is pressed after Done', () => {
      const utils = renderSheet();

      toggleOrderType(utils);
      fireEvent.press(utils.getByText(strings('perps.deposit.done_button')));

      expect(utils.queryByTestId('mock-keypad')).toBeNull();

      fireEvent.press(
        utils.getByTestId(
          PerpsClosePositionBottomSheetSelectorsIDs.LIMIT_PRICE_ROW,
        ),
      );

      expect(utils.getByTestId('mock-keypad')).toBeOnTheScreen();
    });

    it('reopens on the last selected order type', () => {
      const firstOpen = renderSheet();

      toggleOrderType(firstOpen);
      firstOpen.unmount();

      const { getByTestId } = renderSheet();

      expect(
        getByTestId(
          PerpsClosePositionBottomSheetSelectorsIDs.LIMIT_PRICE_INPUT,
        ),
      ).toBeOnTheScreen();
      expect(getByTestId('mock-keypad')).toBeOnTheScreen();
    });

    it('keeps the entered limit price when toggling to market and back to limit', () => {
      const utils = renderSheet();

      toggleOrderType(utils);
      fireEvent.press(utils.getByTestId('mock-keypad'));
      toggleOrderType(utils);
      toggleOrderType(utils);

      expect(
        utils.getByTestId(
          PerpsClosePositionBottomSheetSelectorsIDs.LIMIT_PRICE_INPUT,
        ),
      ).toHaveTextContent('3,100');
    });

    it('hides the limit price field again when switching back to market', () => {
      const utils = renderSheet();
      const { getByTestId, queryByTestId } = utils;

      toggleOrderType(utils);
      toggleOrderType(utils);

      expect(
        queryByTestId(
          PerpsClosePositionBottomSheetSelectorsIDs.LIMIT_PRICE_INPUT,
        ),
      ).toBeNull();
    });

    it('hides the slider while the limit price keypad is open', () => {
      const utils = renderSheet();
      const { getByTestId, UNSAFE_queryAllByType } = utils;

      toggleOrderType(utils);

      expect(
        getByTestId(
          PerpsClosePositionBottomSheetSelectorsIDs.AMOUNT_DISPLAY_TOGGLE,
        ),
      ).toBeOnTheScreen();
      expect(
        UNSAFE_queryAllByType('Slider' as unknown as React.ComponentType),
      ).toHaveLength(0);
    });

    it('does not open a keypad when the close size is shown', () => {
      const { queryByTestId, UNSAFE_queryAllByType } = renderSheet();

      expect(queryByTestId('mock-keypad')).toBeNull();
      expect(
        UNSAFE_queryAllByType('Slider' as unknown as React.ComponentType),
      ).toHaveLength(1);
    });

    it('shows the slider when the close size is pressed on a limit view', () => {
      const utils = renderSheet();
      const { getByLabelText, queryByTestId, UNSAFE_queryAllByType } = utils;

      toggleOrderType(utils);

      fireEvent.press(
        getByLabelText(strings('perps.close_position.select_amount')),
      );

      expect(queryByTestId('mock-keypad')).toBeNull();
      expect(
        UNSAFE_queryAllByType('Slider' as unknown as React.ComponentType),
      ).toHaveLength(1);
      expect(
        utils.getByTestId(
          PerpsClosePositionBottomSheetSelectorsIDs.LIMIT_PRICE_INPUT,
        ),
      ).toBeOnTheScreen();
    });
  });

  describe('limit price validation', () => {
    const selectLimitAndEnterPrice = (value: string) => {
      mockKeypadValue = value;
      const utils = renderSheet();

      toggleOrderType(utils);
      fireEvent.press(utils.getByTestId('mock-keypad'));

      return utils;
    };

    it('does not repeat a limit-price error already shown on the field', () => {
      usePerpsClosePositionValidationMock.mockReturnValue({
        ...defaultPerpsClosePositionValidationMock,
        errors: [strings('perps.order.limit_price_modal.limit_price_too_far')],
        isValid: false,
      });

      const { getAllByText } = selectLimitAndEnterPrice('6');

      expect(
        getAllByText(
          strings('perps.order.limit_price_modal.limit_price_too_far'),
        ),
      ).toHaveLength(1);
    });

    it('does not warn when the limit price is a zero that renders as an empty field', () => {
      const { queryByText } = selectLimitAndEnterPrice('0');

      expect(
        queryByText(strings('perps.order.limit_price_modal.limit_price_below')),
      ).toBeNull();
    });

    it('warns once a limit price below the market price is entered', () => {
      const { getByText } = selectLimitAndEnterPrice('2900');

      expect(
        getByText(strings('perps.order.limit_price_modal.limit_price_below')),
      ).toBeOnTheScreen();
    });
  });

  describe('fee disclaimer', () => {
    it('renders the combined fee rate beneath the CTA', () => {
      const { getByTestId } = renderSheet();

      expect(
        getByTestId(PerpsClosePositionBottomSheetSelectorsIDs.FEE_DISCLAIMER),
      ).toHaveTextContent(
        strings('perps.trade_sheet.includes_fee', { feePercentage: '0.045' }),
      );
    });

    it('hides the fee rate while the keypad covers the CTA', () => {
      const utils = renderSheet();

      toggleOrderType(utils);

      expect(
        utils.queryByTestId(
          PerpsClosePositionBottomSheetSelectorsIDs.FEE_DISCLAIMER,
        ),
      ).toBeNull();
    });

    it('omits the fee rate when no fee rates are available', () => {
      usePerpsOrderFeesMock.mockReturnValue({
        ...defaultPerpsOrderFeesMock,
        protocolFeeRate: undefined,
        metamaskFeeRate: undefined,
      });

      const { queryByTestId } = renderSheet();

      expect(
        queryByTestId(PerpsClosePositionBottomSheetSelectorsIDs.FEE_DISCLAIMER),
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
      const utils = renderSheet();
      const { getByTestId } = utils;

      toggleOrderType(utils);
      fireEvent.press(utils.getByText(strings('perps.deposit.done_button')));

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
      const utils = renderSheet();
      const { getByTestId } = utils;

      toggleOrderType(utils);
      fireEvent.press(getByTestId('mock-keypad'));
      fireEvent.press(utils.getByText(strings('perps.deposit.done_button')));

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
    it('opens the margin tooltip', () => {
      const { getByTestId } = renderSheet();

      fireEvent.press(
        getByTestId(
          PerpsClosePositionBottomSheetSelectorsIDs.MARGIN_TOOLTIP_BUTTON,
        ),
      );

      expect(mockNavigate).toHaveBeenCalled();
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
          PerpsClosePositionBottomSheetSelectorsIDs.ORDER_TYPE_BUTTON,
        ),
      ).toBeNull();
    });
  });
});
