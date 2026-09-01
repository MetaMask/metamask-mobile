import React from 'react';
import {
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react-native';
import { IconName } from '@metamask/design-system-react-native';
import { PERPS_CONSTANTS } from '@metamask/perps-controller';
import { Keyboard, StyleSheet, type View } from 'react-native';
import {
  getPerpsProChaseFormActiveCountSelector,
  PerpsProMarketViewSelectorsIDs,
  PerpsProOrderFormSelectorsIDs,
} from '../../../../Perps.testIds';
import { strings } from '../../../../../../../../locales/i18n';
import { getPerpsProInputAccessoryID } from './PerpsProCompactInput';
import PerpsProOrderForm from './PerpsProOrderForm';
import type { PerpsProOrderFormProps } from './PerpsProOrderForm.types';
import {
  ImpactMoment,
  playImpact,
  playSelection,
} from '../../../../../../../util/haptics';

const mockInputFocus = jest.fn();
let mockInputHandlesActive = true;

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const MockReact = jest.requireActual('react');
  const { TextInput } = jest.requireActual('react-native');

  return {
    ...actual,
    Input: MockReact.forwardRef(
      (props: Record<string, unknown>, ref: React.Ref<unknown>) => {
        MockReact.useImperativeHandle(
          ref,
          () =>
            mockInputHandlesActive
              ? {
                  focus: () => mockInputFocus(props.testID),
                  blur: jest.fn(),
                }
              : null,
          [props.testID, mockInputHandlesActive],
        );
        return MockReact.createElement(TextInput, props);
      },
    ),
  };
});

jest.mock('../../../../components/PerpsSlider', () => 'PerpsSlider');
jest.mock('../../../../components/PerpsFeesDisplay', () => 'PerpsFeesDisplay');

jest.mock('../../../../../../../util/haptics');

const host = (name: string) => name as unknown as React.ComponentType<unknown>;

const ids = PerpsProOrderFormSelectorsIDs;

const createSizeInput = (
  overrides: Partial<PerpsProOrderFormProps['sizeInput']> = {},
): PerpsProOrderFormProps['sizeInput'] => ({
  value: '',
  denomination: { unit: 'usd' },
  canToggleDenomination: true,
  onChange: jest.fn(),
  onFocus: jest.fn(),
  onBlur: jest.fn(),
  onToggleDenomination: jest.fn(),
  ...overrides,
});

const createSizeSlider = (
  overrides: Partial<PerpsProOrderFormProps['sizeSlider']> = {},
): PerpsProOrderFormProps['sizeSlider'] => ({
  value: 0,
  maximumValue: 1000,
  onValueChange: jest.fn(),
  onDragEnd: jest.fn(),
  onDragCancel: jest.fn(),
  ...overrides,
});

const createTwap = (
  overrides: Partial<PerpsProOrderFormProps['twap']> = {},
): PerpsProOrderFormProps['twap'] => ({
  days: '',
  hours: '',
  minutes: '5',
  randomize: false,
  onDaysChange: jest.fn(),
  onHoursChange: jest.fn(),
  onMinutesChange: jest.fn(),
  onRandomizeChange: jest.fn(),
  ...overrides,
});

const createScaleOrder = (): PerpsProOrderFormProps['scaleOrder'] => ({
  startPrice: '100',
  endPrice: '200',
  totalOrders: '2',
  sizeSkew: '1.00',
  onStartPriceChange: jest.fn(),
  onStartPriceBlur: jest.fn(),
  onEndPriceChange: jest.fn(),
  onEndPriceBlur: jest.fn(),
  onTotalOrdersChange: jest.fn(),
  onTotalOrdersBlur: jest.fn(),
  onSizeSkewChange: jest.fn(),
  onSizeSkewBlur: jest.fn(),
  onSizeSkewInfoPress: jest.fn(),
  rungs: [
    { index: 0, price: '100', size: '1' },
    { index: 1, price: '200', size: '1' },
  ],
  marginRange: '$50 → $100',
  liquidationRange: '$80 → $160',
  fees: '$1',
});

const createScaleKeyboardScroll = () => ({
  startPrice: {
    cardRef: React.createRef<View>(),
    onFocus: jest.fn(),
    onBlur: jest.fn(),
    realign: jest.fn(),
  },
  endPrice: {
    cardRef: React.createRef<View>(),
    onFocus: jest.fn(),
    onBlur: jest.fn(),
    realign: jest.fn(),
  },
  totalOrders: {
    cardRef: React.createRef<View>(),
    onFocus: jest.fn(),
    onBlur: jest.fn(),
    realign: jest.fn(),
  },
  sizeSkew: {
    cardRef: React.createRef<View>(),
    onFocus: jest.fn(),
    onBlur: jest.fn(),
    realign: jest.fn(),
  },
});

const createProps = (
  overrides: Partial<PerpsProOrderFormProps> = {},
): PerpsProOrderFormProps => {
  const { sizeInput, sizeSlider, ...rest } = overrides;
  return {
    direction: 'long',
    onDirectionChange: jest.fn(),
    marginModeLabel: 'Isolated',
    leverageLabel: '3x',
    orderType: 'market',
    scaleOrder: createScaleOrder(),
    onOrderTypeButtonPress: jest.fn(),
    limitPrice: '',
    onLimitPriceChange: jest.fn(),
    onLimitPriceBlur: jest.fn(),
    sizeInput: createSizeInput(sizeInput),
    sizeSlider: createSizeSlider(sizeSlider),
    availableBalance: '-- available',
    reduceOnly: false,
    onReduceOnlyChange: jest.fn(),
    twap: createTwap(),
    onTwapDurationPress: jest.fn(),
    isTPSLConfigured: false,
    notices: [],
    summary: { margin: '--', liquidationPrice: '--', slippage: '--' },
    placeOrderLabel: 'Place order',
    placeOrderIntent: 'long',
    onPlaceOrderPress: jest.fn(),
    ...rest,
  };
};

const renderForm = (overrides: Partial<PerpsProOrderFormProps> = {}) =>
  render(<PerpsProOrderForm {...createProps(overrides)} />);

const getMountedInput = (testID: string) =>
  screen.getByTestId(testID, { includeHiddenElements: true });

describe('PerpsProOrderForm', () => {
  beforeEach(() => {
    mockInputFocus.mockClear();
    mockInputHandlesActive = true;
    jest.mocked(playImpact).mockClear();
    jest.mocked(playSelection).mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('inputs', () => {
    it('uses ButtonBase text rendering for non-Chase order titles', () => {
      renderForm({ orderType: 'market' });

      expect(
        screen.queryByTestId(`${ids.ORDER_TYPE_BUTTON}-label-row`),
      ).not.toBeOnTheScreen();
      expect(screen.getByTestId(ids.ORDER_TYPE_BUTTON)).toHaveTextContent(
        strings('perps.order.type.market.title'),
      );
    });

    it('exposes the active Chase count only on the Chase form', () => {
      const view = renderForm({ activeChaseCount: 2 });

      expect(
        screen.queryByTestId(getPerpsProChaseFormActiveCountSelector(2)),
      ).not.toBeOnTheScreen();

      view.rerender(
        <PerpsProOrderForm
          {...createProps({ orderType: 'chase', activeChaseCount: 2 })}
        />,
      );

      expect(
        screen.getByTestId(getPerpsProChaseFormActiveCountSelector(2)),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(getPerpsProChaseFormActiveCountSelector(2)),
      ).toHaveTextContent(strings('perps.order.type.chase.title'));
      expect(screen.getByTestId(ids.ORDER_TYPE_BUTTON)).toHaveProp(
        'accessibilityLabel',
        strings('perps.order.type.chase.title'),
      );
    });

    it('renders the compact Chase card and toggles the distance unit', () => {
      const onChaseMaxDistanceUnitChange = jest.fn();
      renderForm({
        orderType: 'chase',
        chaseReferencePrice: '$2,500.50',
        chaseMaxDistanceUnit: 'usd',
        onChaseMaxDistanceUnitChange,
      });

      expect(screen.getByTestId(ids.CHASE_REFERENCE_PRICE)).toHaveTextContent(
        '$2,500.50',
      );
      expect(
        screen.getByTestId(ids.CHASE_MAX_DISTANCE_INPUT),
      ).toBeOnTheScreen();
      expect(
        within(screen.getByTestId(ids.ORDER_TYPE_CARD)).getByTestId(
          ids.CHASE_MAX_DISTANCE_INPUT,
        ),
      ).toBeOnTheScreen();
      expect(screen.getByTestId(ids.CHASE_MAX_DISTANCE_INPUT)).toHaveProp(
        'accessibilityLabel',
        `${strings('perps.order.chase.max_distance')} (USD)`,
      );
      expect(
        screen.getByTestId(ids.CHASE_MAX_DISTANCE_PREFIX),
      ).toHaveTextContent('$');
      expect(screen.getByTestId(ids.CHASE_MAX_DISTANCE_INPUT)).toHaveProp(
        'placeholder',
        '0.00',
      );
      expect(
        screen.getByTestId(
          PerpsProMarketViewSelectorsIDs.CHASE_FOREGROUND_WARNING,
        ),
      ).toHaveTextContent(strings('perps.order.chase.foreground_notice'));
      expect(
        within(screen.getByTestId(ids.ORDER_TYPE_CARD)).queryByTestId(
          PerpsProMarketViewSelectorsIDs.CHASE_FOREGROUND_WARNING,
        ),
      ).not.toBeOnTheScreen();
      fireEvent.press(screen.getByTestId(ids.CHASE_MAX_DISTANCE_UNIT));

      expect(onChaseMaxDistanceUnitChange).toHaveBeenCalledWith('percent');
      expect(screen.queryByText('Slippage')).not.toBeOnTheScreen();
    });

    it('formats an empty Chase percentage distance with its unit', () => {
      renderForm({
        orderType: 'chase',
        chaseMaxDistanceUnit: 'percent',
      });

      expect(
        screen.queryByTestId(ids.CHASE_MAX_DISTANCE_PREFIX),
      ).not.toBeOnTheScreen();
      expect(screen.getByTestId(ids.CHASE_MAX_DISTANCE_INPUT)).toHaveProp(
        'placeholder',
        '0%',
      );
    });

    it('announces the target Chase max-distance unit', () => {
      const { rerender } = renderForm({
        orderType: 'chase',
        chaseMaxDistanceUnit: 'usd',
      });

      expect(screen.getByTestId(ids.CHASE_MAX_DISTANCE_UNIT)).toHaveProp(
        'accessibilityLabel',
        strings('perps.order.chase.switch_max_distance_unit', { unit: '%' }),
      );

      rerender(
        <PerpsProOrderForm
          {...createProps({
            orderType: 'chase',
            chaseMaxDistanceUnit: 'percent',
          })}
        />,
      );

      expect(screen.getByTestId(ids.CHASE_MAX_DISTANCE_UNIT)).toHaveProp(
        'accessibilityLabel',
        strings('perps.order.chase.switch_max_distance_unit', { unit: 'USD' }),
      );
    });

    it('passes raw size text to sizeInput.onChange', () => {
      const onChange = jest.fn();
      renderForm({ sizeInput: createSizeInput({ onChange }) });

      fireEvent.changeText(screen.getByTestId(ids.SIZE_INPUT), '1..2');

      expect(onChange).toHaveBeenCalledWith('1..2');
    });

    it('passes raw limit price text to onLimitPriceChange', () => {
      const onLimitPriceChange = jest.fn();
      renderForm({ orderType: 'limit', onLimitPriceChange });

      fireEvent.changeText(getMountedInput(ids.LIMIT_PRICE_INPUT), '.123');

      expect(onLimitPriceChange).toHaveBeenCalledWith('.123');
    });

    it('omits the Mid chip when onUseMidPricePress is not provided', () => {
      renderForm({ orderType: 'limit' });

      expect(getMountedInput(ids.LIMIT_PRICE_INPUT)).toBeOnTheScreen();
      expect(screen.queryByTestId(ids.MID_PRICE_BUTTON)).not.toBeOnTheScreen();
    });

    it('renders the Mid chip for a plain limit order when provided', () => {
      renderForm({ orderType: 'limit', onUseMidPricePress: jest.fn() });

      expect(screen.getByTestId(ids.MID_PRICE_BUTTON)).toBeOnTheScreen();
    });

    it('wires limit price blur to onLimitPriceBlur', () => {
      const onLimitPriceBlur = jest.fn();
      renderForm({ orderType: 'limit', onLimitPriceBlur });

      fireEvent(getMountedInput(ids.LIMIT_PRICE_INPUT), 'blur');

      expect(onLimitPriceBlur).toHaveBeenCalledTimes(1);
    });

    it('forwards limit price focus to onLimitPriceFocus', () => {
      const onLimitPriceFocus = jest.fn();
      renderForm({ orderType: 'limit', onLimitPriceFocus });

      fireEvent(getMountedInput(ids.LIMIT_PRICE_INPUT), 'focus');

      expect(onLimitPriceFocus).toHaveBeenCalledTimes(1);
    });

    it('reports every limit price tap so an already-focused field can realign', () => {
      const onLimitPriceFieldPress = jest.fn();
      renderForm({ orderType: 'limit', onLimitPriceFieldPress });

      // `pressIn` rather than `focus`: re-tapping a focused input fires no
      // focus event, which is the case this callback exists to cover.
      fireEvent(getMountedInput(ids.LIMIT_PRICE_INPUT), 'pressIn');

      expect(onLimitPriceFieldPress).toHaveBeenCalledTimes(1);
    });

    it('exposes the order-type card so it can be measured against the keyboard', () => {
      const orderTypeCardRef = React.createRef<View>();
      renderForm({ orderType: 'limit', orderTypeCardRef });

      expect(orderTypeCardRef.current).not.toBeNull();
    });

    it('renders limit price input for limit orders', () => {
      renderForm({ orderType: 'limit' });

      expect(getMountedInput(ids.LIMIT_PRICE_INPUT)).toBeOnTheScreen();
    });

    it('reveals the dollar prefix after activating a limit price field', () => {
      renderForm({ orderType: 'limit' });

      fireEvent.press(screen.getByTestId(`${ids.LIMIT_PRICE_INPUT}-field`));

      expect(screen.getByTestId(ids.LIMIT_PRICE_PREFIX)).toHaveTextContent('$');
    });

    it('omits limit price input for market orders', () => {
      renderForm({ orderType: 'market' });

      expect(screen.queryByTestId(ids.LIMIT_PRICE_INPUT)).not.toBeOnTheScreen();
    });

    it('renders Scale configuration inputs', () => {
      renderForm({
        orderType: 'scale',
        scaleOrder: createScaleOrder(),
      });

      expect(screen.getByTestId(ids.SCALE_START_PRICE)).toBeOnTheScreen();
      expect(screen.getByTestId(ids.SCALE_END_PRICE)).toBeOnTheScreen();
      expect(screen.getByTestId(ids.SCALE_TOTAL_ORDERS)).toBeOnTheScreen();
      expect(screen.getByTestId(ids.SCALE_SIZE_SKEW)).toBeOnTheScreen();
      expect(screen.getByTestId(ids.SCALE_TOTAL_ORDERS)).toHaveProp(
        'keyboardType',
        'number-pad',
      );
    });

    it('wires every Scale field into keyboard scrolling', () => {
      const scaleOrder = createScaleOrder();
      const scaleKeyboardScroll = createScaleKeyboardScroll();
      renderForm({ orderType: 'scale', scaleOrder, scaleKeyboardScroll });

      const fields = [
        [ids.SCALE_START_PRICE, scaleKeyboardScroll.startPrice],
        [ids.SCALE_END_PRICE, scaleKeyboardScroll.endPrice],
        [ids.SCALE_TOTAL_ORDERS, scaleKeyboardScroll.totalOrders],
        [ids.SCALE_SIZE_SKEW, scaleKeyboardScroll.sizeSkew],
      ] as const;

      for (const [testID, keyboardScroll] of fields) {
        fireEvent(screen.getByTestId(testID), 'focus');
        fireEvent.press(screen.getByTestId(`${testID}-field`));
        fireEvent(screen.getByTestId(testID), 'blur');

        expect(keyboardScroll.onFocus).toHaveBeenCalledTimes(1);
        expect(keyboardScroll.realign).toHaveBeenCalledTimes(1);
        expect(keyboardScroll.onBlur).toHaveBeenCalledTimes(1);
      }

      expect(scaleOrder.onStartPriceBlur).toHaveBeenCalledTimes(1);
      expect(scaleOrder.onEndPriceBlur).toHaveBeenCalledTimes(1);
      expect(scaleOrder.onTotalOrdersBlur).toHaveBeenCalledTimes(1);
      expect(scaleOrder.onSizeSkewBlur).toHaveBeenCalledTimes(1);
    });

    it('renders blank default Scale prices and order count without zero placeholders', () => {
      const scaleOrder = createScaleOrder();
      scaleOrder.startPrice = '';
      scaleOrder.endPrice = '';
      scaleOrder.totalOrders = '';
      renderForm({ orderType: 'scale', scaleOrder });

      for (const inputTestID of [
        ids.SCALE_START_PRICE,
        ids.SCALE_END_PRICE,
        ids.SCALE_TOTAL_ORDERS,
      ]) {
        expect(screen.getByTestId(inputTestID)).toHaveProp('value', '');
        expect(screen.getByTestId(inputTestID)).toHaveProp('placeholder', '');
      }
      expect(
        within(
          screen.getByTestId(`${ids.SCALE_START_PRICE}-container`),
        ).queryByText('$'),
      ).not.toBeOnTheScreen();
      expect(
        within(
          screen.getByTestId(`${ids.SCALE_END_PRICE}-container`),
        ).queryByText('$'),
      ).not.toBeOnTheScreen();
    });

    it('locks every editable Scale control while placement is loading', () => {
      renderForm({
        orderType: 'scale',
        scaleOrder: createScaleOrder(),
        sizeInput: createSizeInput(),
        isPlaceOrderLoading: true,
        onMarginModePress: jest.fn(),
        onLeveragePress: jest.fn(),
        onAddFundsPress: jest.fn(),
      });

      expect(screen.getByTestId(ids.DIRECTION_LONG)).toBeDisabled();
      expect(screen.getByTestId(ids.DIRECTION_SHORT)).toBeDisabled();
      expect(screen.getByTestId(ids.MARGIN_MODE_BUTTON)).toBeDisabled();
      expect(screen.getByTestId(ids.LEVERAGE_BUTTON)).toBeDisabled();
      expect(screen.getByTestId(ids.ORDER_TYPE_BUTTON)).toBeDisabled();
      expect(screen.getByTestId(ids.SCALE_START_PRICE)).toHaveProp(
        'isDisabled',
        true,
      );
      expect(screen.getByTestId(ids.SCALE_END_PRICE)).toHaveProp(
        'isDisabled',
        true,
      );
      expect(screen.getByTestId(ids.SCALE_TOTAL_ORDERS)).toHaveProp(
        'isDisabled',
        true,
      );
      expect(screen.getByTestId(ids.SCALE_SIZE_SKEW)).toHaveProp(
        'isDisabled',
        true,
      );
      expect(screen.getByTestId(ids.SIZE_INPUT)).toHaveProp('isDisabled', true);
      expect(screen.getByTestId(ids.SIZE_FIELD)).toBeDisabled();
      expect(screen.getByTestId(ids.SIZE_UNIT_BUTTON)).toBeDisabled();
      expect(screen.UNSAFE_getByType(host('PerpsSlider'))).toHaveProp(
        'disabled',
        true,
      );
      expect(screen.getByTestId(ids.ADD_FUNDS_BUTTON)).toBeDisabled();
      expect(screen.getByTestId(ids.REDUCE_ONLY)).toBeDisabled();
    });

    it('groups all four divided Scale rows inside the shared order card', () => {
      renderForm({
        orderType: 'scale',
        scaleOrder: createScaleOrder(),
      });
      const orderCard = within(screen.getByTestId(ids.ORDER_TYPE_CARD));

      expect(orderCard.getByTestId(ids.SCALE_START_PRICE)).toBeOnTheScreen();
      expect(orderCard.getByTestId(ids.SCALE_END_PRICE)).toBeOnTheScreen();
      expect(orderCard.getByTestId(ids.SCALE_TOTAL_ORDERS)).toBeOnTheScreen();
      expect(orderCard.getByTestId(ids.SCALE_SIZE_SKEW)).toBeOnTheScreen();
      expect(orderCard.queryByTestId(ids.SCALE_PREVIEW)).not.toBeOnTheScreen();
    });

    it('renders Scale rung prices with canonical fiat formatting', () => {
      const scaleOrder = createScaleOrder();
      scaleOrder.rungs = [
        { index: 0, price: '1234.5678', size: '1' },
        { index: 1, price: '0.00123456', size: '1' },
      ];
      renderForm({
        orderType: 'scale',
        scaleOrder,
      });

      expect(screen.getByTestId(ids.SCALE_PREVIEW)).toBeOnTheScreen();
      expect(
        screen.getByTestId(ids.SCALE_PREVIEW_START_VALUE),
      ).toHaveTextContent('$1,234.6');
      expect(screen.getByTestId(ids.SCALE_PREVIEW_END_VALUE)).toHaveTextContent(
        '$0.001235',
      );
    });

    it('always renders the five-row incomplete Scale summary', () => {
      const scaleOrder = createScaleOrder();
      scaleOrder.rungs = [];
      scaleOrder.marginRange = PERPS_CONSTANTS.FallbackPriceDisplay;
      scaleOrder.liquidationRange = PERPS_CONSTANTS.FallbackPriceDisplay;
      scaleOrder.fees = PERPS_CONSTANTS.FallbackPriceDisplay;
      renderForm({
        orderType: 'scale',
        scaleOrder,
      });

      expect(
        screen.getByTestId(ids.SCALE_PREVIEW_START_VALUE),
      ).toHaveTextContent(PERPS_CONSTANTS.FallbackPriceDisplay);
      expect(screen.getByTestId(ids.SCALE_PREVIEW_END_VALUE)).toHaveTextContent(
        PERPS_CONSTANTS.FallbackPriceDisplay,
      );
      expect(
        screen.getByTestId(ids.SCALE_PREVIEW_MARGIN_VALUE),
      ).toHaveTextContent(PERPS_CONSTANTS.FallbackPriceDisplay);
      expect(
        screen.getByTestId(ids.SCALE_PREVIEW_LIQUIDATION_VALUE),
      ).toHaveTextContent(PERPS_CONSTANTS.FallbackPriceDisplay);
      expect(
        screen.getByTestId(ids.SCALE_PREVIEW_FEES_VALUE),
      ).toHaveTextContent(PERPS_CONSTANTS.FallbackPriceDisplay);
    });

    it('renders completed Scale prices and ranges with dedicated selectors', () => {
      renderForm({ orderType: 'scale', scaleOrder: createScaleOrder() });

      expect(
        screen.getByTestId(ids.SCALE_PREVIEW_START_VALUE),
      ).toHaveTextContent('$100');
      expect(screen.getByTestId(ids.SCALE_PREVIEW_END_VALUE)).toHaveTextContent(
        '$200',
      );
      expect(
        screen.getByTestId(ids.SCALE_PREVIEW_MARGIN_VALUE),
      ).toHaveTextContent('$50 → $100');
      expect(
        screen.getByTestId(ids.SCALE_PREVIEW_LIQUIDATION_VALUE),
      ).toHaveTextContent('$80 → $160');
      expect(
        screen.getByTestId(ids.SCALE_PREVIEW_FEES_VALUE),
      ).toHaveTextContent('$1');
    });

    it('allows the complete Scale liquidation range to wrap', () => {
      const scaleOrder = createScaleOrder();
      scaleOrder.liquidationRange = '$1,360.5 → $1,722.4';
      renderForm({ orderType: 'scale', scaleOrder });

      expect(
        screen.getByTestId(ids.SCALE_PREVIEW_LIQUIDATION_VALUE),
      ).toHaveTextContent('$1,360.5 → $1,722.4');
      expect(
        screen.getByTestId(ids.SCALE_PREVIEW_LIQUIDATION_VALUE),
      ).toHaveProp('numberOfLines', 0);
    });

    it('omits ordinary price and TP/SL rows for Scale', () => {
      renderForm({
        orderType: 'scale',
        scaleOrder: createScaleOrder(),
        onTPSLPress: jest.fn(),
      });

      expect(screen.queryByTestId(ids.LIMIT_PRICE_INPUT)).not.toBeOnTheScreen();
      expect(screen.queryByTestId(ids.TPSL)).not.toBeOnTheScreen();
    });

    it.each([
      { orderType: 'market' as const, labels: [] },
      {
        orderType: 'limit' as const,
        labels: [
          {
            inputID: ids.LIMIT_PRICE_INPUT,
            label: strings('perps.order.limit_price'),
          },
        ],
      },
      {
        orderType: 'stop_market' as const,
        labels: [
          {
            inputID: ids.TRIGGER_PRICE_INPUT,
            label: strings('perps.order.trigger_price'),
          },
        ],
      },
      {
        orderType: 'take_profit_market' as const,
        labels: [
          {
            inputID: ids.TRIGGER_PRICE_INPUT,
            label: strings('perps.order.trigger_price'),
          },
        ],
      },
      {
        orderType: 'stop_limit' as const,
        labels: [
          {
            inputID: ids.TRIGGER_PRICE_INPUT,
            label: strings('perps.order.trigger_price'),
          },
          {
            inputID: ids.LIMIT_PRICE_INPUT,
            label: strings('perps.order.limit_price'),
          },
        ],
      },
      {
        orderType: 'take_profit_limit' as const,
        labels: [
          {
            inputID: ids.TRIGGER_PRICE_INPUT,
            label: strings('perps.order.trigger_price'),
          },
          {
            inputID: ids.LIMIT_PRICE_INPUT,
            label: strings('perps.order.limit_price'),
          },
        ],
      },
    ])('assigns the $orderType price labels', ({ orderType, labels }) => {
      renderForm({ orderType });

      const expectedLabels = new Map(
        labels.map(({ inputID, label }) => [inputID, label]),
      );
      for (const inputID of [ids.TRIGGER_PRICE_INPUT, ids.LIMIT_PRICE_INPUT]) {
        const labelTestID = `${inputID}-label`;
        const expectedLabel = expectedLabels.get(inputID);
        if (expectedLabel) {
          expect(screen.getByTestId(labelTestID)).toHaveTextContent(
            expectedLabel,
          );
        } else {
          expect(screen.queryByTestId(labelTestID)).not.toBeOnTheScreen();
        }
      }
    });

    it.each([
      { orderType: 'stop_limit' as const, title: 'Stop limit' },
      { orderType: 'take_profit_limit' as const, title: 'Take limit' },
    ])(
      'renders trigger and limit price inputs with Mid for $orderType orders',
      ({ orderType, title }) => {
        const onUseMidPricePress = jest.fn();

        renderForm({
          orderType,
          triggerPrice: '91000',
          onUseMidPricePress,
        });

        expect(getMountedInput(ids.TRIGGER_PRICE_INPUT)).toBeOnTheScreen();
        expect(getMountedInput(ids.LIMIT_PRICE_INPUT)).toBeOnTheScreen();
        expect(screen.getByTestId(ids.MID_PRICE_BUTTON)).toBeOnTheScreen();
        expect(screen.getByTestId(ids.ORDER_TYPE_BUTTON)).toHaveTextContent(
          title,
        );

        fireEvent.press(screen.getByTestId(ids.MID_PRICE_BUTTON));

        expect(onUseMidPricePress).toHaveBeenCalledTimes(1);
      },
    );

    it.each(['stop_market', 'take_profit_market'] as const)(
      'renders trigger price and omits limit price for %s orders',
      (orderType) => {
        renderForm({ orderType });

        expect(getMountedInput(ids.TRIGGER_PRICE_INPUT)).toBeOnTheScreen();
        expect(
          screen.queryByTestId(ids.LIMIT_PRICE_INPUT),
        ).not.toBeOnTheScreen();
        expect(
          screen.queryByTestId(ids.MID_PRICE_BUTTON),
        ).not.toBeOnTheScreen();
        expect(screen.queryByTestId(ids.TPSL)).not.toBeOnTheScreen();
      },
    );

    it('hides TP/SL for take-profit order types', () => {
      renderForm({
        orderType: 'take_profit_limit',
        onTPSLPress: jest.fn(),
      });

      expect(screen.queryByTestId(ids.TPSL)).not.toBeOnTheScreen();
    });

    it('groups TWAP runtime and Randomize inside the order card', () => {
      renderForm({ orderType: 'twap' });
      const orderCard = within(screen.getByTestId(ids.ORDER_TYPE_CARD));

      expect(orderCard.getByTestId(ids.ORDER_TYPE_BUTTON)).toBeOnTheScreen();
      expect(orderCard.getByTestId(ids.TWAP_DURATION_BUTTON)).toBeOnTheScreen();
      expect(orderCard.getByTestId(ids.TWAP_RANDOMIZE)).toBeOnTheScreen();
    });

    it('opens the TWAP duration sheet from the compact Runtime row', () => {
      const onTwapDurationPress = jest.fn();
      renderForm({ orderType: 'twap', onTwapDurationPress });

      fireEvent.press(screen.getByTestId(ids.TWAP_DURATION_BUTTON));

      expect(onTwapDurationPress).toHaveBeenCalledTimes(1);
    });

    it('displays the compact TWAP duration value', () => {
      renderForm({
        orderType: 'twap',
        twap: createTwap({ days: '1', hours: '2', minutes: '30' }),
      });

      expect(screen.getByTestId(ids.TWAP_DURATION_VALUE)).toHaveTextContent(
        '1d 2h 30m',
      );
      expect(
        screen.queryByTestId(ids.TWAP_DURATION_PICKER),
      ).not.toBeOnTheScreen();
    });

    it('updates TWAP Randomize from the compact card row', () => {
      const onRandomizeChange = jest.fn();
      renderForm({
        orderType: 'twap',
        twap: createTwap({ onRandomizeChange }),
      });

      fireEvent.press(screen.getByTestId(ids.TWAP_RANDOMIZE));

      expect(onRandomizeChange).toHaveBeenCalledWith(true);
    });

    it('passes raw trigger price text to onTriggerPriceChange', () => {
      const onTriggerPriceChange = jest.fn();
      renderForm({ orderType: 'stop_market', onTriggerPriceChange });

      fireEvent.changeText(getMountedInput(ids.TRIGGER_PRICE_INPUT), '.123');

      expect(onTriggerPriceChange).toHaveBeenCalledWith('.123');
    });

    it('wires trigger price blur to onTriggerPriceBlur', () => {
      const onTriggerPriceBlur = jest.fn();
      renderForm({ orderType: 'take_profit_market', onTriggerPriceBlur });

      fireEvent(getMountedInput(ids.TRIGGER_PRICE_INPUT), 'blur');

      expect(onTriggerPriceBlur).toHaveBeenCalledTimes(1);
    });

    it('shows a blocking helper under the price card', () => {
      renderForm({
        orderType: 'stop_market',
        priceCardMessage: {
          severity: 'error',
          message: 'Trigger price must be higher than mid price',
        },
      });

      expect(screen.getByTestId(ids.PRICE_CARD_MESSAGE)).toHaveTextContent(
        'Trigger price must be higher than mid price',
      );
    });

    it('renders the size label with the active unit', () => {
      renderForm({
        sizeInput: createSizeInput({ denomination: { unit: 'usd' } }),
      });

      expect(screen.getByTestId(ids.SIZE_UNIT_LABEL)).toHaveTextContent(
        'Size (USD)',
      );
    });

    it('renders the dollar prefix for USD size', () => {
      renderForm({
        sizeInput: createSizeInput({ denomination: { unit: 'usd' } }),
      });

      expect(screen.getByTestId(ids.SIZE_PREFIX)).toHaveTextContent('$');
    });

    it('omits the dollar prefix for asset size', () => {
      renderForm({
        sizeInput: createSizeInput({
          denomination: { unit: 'asset', symbol: 'BTC' },
        }),
      });

      expect(screen.queryByTestId(ids.SIZE_PREFIX)).not.toBeOnTheScreen();
      expect(screen.getByTestId(ids.SIZE_UNIT_LABEL)).toHaveTextContent(
        'Size (BTC)',
      );
    });

    it('forwards size focus and blur callbacks', () => {
      const onFocus = jest.fn();
      const onBlur = jest.fn();
      renderForm({ sizeInput: createSizeInput({ onFocus, onBlur }) });

      fireEvent(screen.getByTestId(ids.SIZE_INPUT), 'focus');
      fireEvent(screen.getByTestId(ids.SIZE_INPUT), 'blur');

      expect(onFocus).toHaveBeenCalledTimes(1);
      expect(onBlur).toHaveBeenCalledTimes(1);
    });

    it('shows available balance with add funds action below the size input', () => {
      renderForm({
        availableBalance: '$250 available',
        onAddFundsPress: jest.fn(),
      });

      expect(screen.getByTestId(ids.AVAILABLE_BALANCE)).toHaveTextContent(
        '$250 available',
      );
      expect(screen.getByTestId(ids.ADD_FUNDS_BUTTON)).toBeOnTheScreen();
    });

    it('announces the available balance and the add funds action to screen readers', () => {
      renderForm({
        availableBalance: '$250 available',
        onAddFundsPress: jest.fn(),
      });

      const addFundsButton = screen.getByTestId(ids.ADD_FUNDS_BUTTON);

      expect(addFundsButton).toHaveAccessibleName('$250 available');
      expect(addFundsButton.props.accessibilityHint).toBe('Add funds');
    });

    it('calls onAddFundsPress when the available balance text is pressed', () => {
      const onAddFundsPress = jest.fn();
      renderForm({ availableBalance: '$250 available', onAddFundsPress });

      fireEvent.press(screen.getByTestId(ids.AVAILABLE_BALANCE));

      expect(onAddFundsPress).toHaveBeenCalledTimes(1);
      expect(playImpact).toHaveBeenCalledWith(ImpactMoment.PrimaryCTA);
    });

    it('does not play Add funds haptics when the action is disabled', () => {
      renderForm({ onAddFundsPress: undefined });

      expect(screen.getByTestId(ids.ADD_FUNDS_BUTTON)).toBeDisabled();
      expect(playImpact).not.toHaveBeenCalled();
    });

    const sizeAccessoryID = getPerpsProInputAccessoryID(ids.SIZE_INPUT);
    const triggerAccessoryID = getPerpsProInputAccessoryID(
      ids.TRIGGER_PRICE_INPUT,
    );
    const limitPriceAccessoryID = getPerpsProInputAccessoryID(
      ids.LIMIT_PRICE_INPUT,
    );
    const scaleAccessoryIDs = [
      ids.SCALE_START_PRICE,
      ids.SCALE_END_PRICE,
      ids.SCALE_TOTAL_ORDERS,
      ids.SCALE_SIZE_SKEW,
    ].map(getPerpsProInputAccessoryID);
    const chaseMaxDistanceAccessoryID = getPerpsProInputAccessoryID(
      ids.CHASE_MAX_DISTANCE_INPUT,
    );
    const expectedAccessoryIDs = [
      sizeAccessoryID,
      triggerAccessoryID,
      limitPriceAccessoryID,
      ...scaleAccessoryIDs,
    ];
    const mountedAccessoryIDs = () =>
      screen
        .UNSAFE_getAllByType(host('RCTInputAccessoryView'))
        .map((accessory) => accessory.props.nativeID);

    it('keeps all keyboard accessories mounted on market', () => {
      renderForm({ orderType: 'market' });

      expect(
        screen.getByTestId(ids.TRIGGER_PRICE_INPUT, {
          includeHiddenElements: true,
        }),
      ).toHaveProp('inputAccessoryViewID', triggerAccessoryID);
      expect(
        screen.getByTestId(ids.LIMIT_PRICE_INPUT, {
          includeHiddenElements: true,
        }),
      ).toHaveProp('inputAccessoryViewID', limitPriceAccessoryID);
      expect(
        screen.queryByTestId(ids.TRIGGER_PRICE_INPUT),
      ).not.toBeOnTheScreen();
      expect(screen.queryByTestId(ids.LIMIT_PRICE_INPUT)).not.toBeOnTheScreen();
      expect(
        screen.getByTestId(ids.SCALE_START_PRICE, {
          includeHiddenElements: true,
        }),
      ).toHaveProp('inputAccessoryViewID', scaleAccessoryIDs[0]);
      expect(screen.queryByTestId(ids.SCALE_START_PRICE)).not.toBeOnTheScreen();
      expect(mountedAccessoryIDs()).toEqual(expectedAccessoryIDs);
    });

    it('connects the trigger input to its pre-mounted accessory on stop-market', () => {
      renderForm({ orderType: 'stop_market' });

      expect(getMountedInput(ids.TRIGGER_PRICE_INPUT)).toBeOnTheScreen();
      expect(getMountedInput(ids.TRIGGER_PRICE_INPUT)).toHaveProp(
        'inputAccessoryViewID',
        triggerAccessoryID,
      );
      expect(screen.queryByTestId(ids.MID_PRICE_BUTTON)).not.toBeOnTheScreen();
      expect(mountedAccessoryIDs()).toEqual(expectedAccessoryIDs);
    });

    it('connects each visible iOS numeric input to its own keyboard accessory', () => {
      renderForm({ orderType: 'limit' });

      expect(screen.getByTestId(ids.SIZE_INPUT)).toHaveProp(
        'inputAccessoryViewID',
        sizeAccessoryID,
      );
      expect(getMountedInput(ids.LIMIT_PRICE_INPUT)).toHaveProp(
        'inputAccessoryViewID',
        limitPriceAccessoryID,
      );
      expect(sizeAccessoryID).not.toBe(limitPriceAccessoryID);
      expect(mountedAccessoryIDs()).toEqual(expectedAccessoryIDs);
    });

    it('routes Chase keyboard navigation between max distance and size', () => {
      renderForm({ orderType: 'chase' });

      expect(screen.getByTestId(ids.CHASE_MAX_DISTANCE_INPUT)).toHaveProp(
        'inputAccessoryViewID',
        chaseMaxDistanceAccessoryID,
      );
      expect(mountedAccessoryIDs()).toEqual([
        ...expectedAccessoryIDs,
        chaseMaxDistanceAccessoryID,
      ]);
      expect(
        screen.getByTestId(
          `${ids.KEYBOARD_PREVIOUS}-${ids.CHASE_MAX_DISTANCE_INPUT}`,
        ),
      ).toBeDisabled();
      expect(
        screen.getByTestId(`${ids.KEYBOARD_NEXT}-${ids.SIZE_INPUT}`),
      ).toBeDisabled();

      fireEvent.press(
        screen.getByTestId(
          `${ids.KEYBOARD_NEXT}-${ids.CHASE_MAX_DISTANCE_INPUT}`,
        ),
      );
      fireEvent.press(
        screen.getByTestId(`${ids.KEYBOARD_PREVIOUS}-${ids.SIZE_INPUT}`),
      );

      expect(mockInputFocus).toHaveBeenNthCalledWith(1, ids.SIZE_INPUT);
      expect(mockInputFocus).toHaveBeenNthCalledWith(
        2,
        ids.CHASE_MAX_DISTANCE_INPUT,
      );
      expect(
        screen.getByTestId(
          `${ids.KEYBOARD_DONE}-${ids.CHASE_MAX_DISTANCE_INPUT}`,
        ),
      ).toBeOnTheScreen();
    });

    it('focuses Chase max distance from Size Previous after its input handle activates', () => {
      mockInputHandlesActive = false;
      const { rerender } = renderForm({ orderType: 'chase' });
      mockInputHandlesActive = true;
      rerender(<PerpsProOrderForm {...createProps({ orderType: 'chase' })} />);

      fireEvent.press(
        screen.getByTestId(`${ids.KEYBOARD_PREVIOUS}-${ids.SIZE_INPUT}`),
      );

      expect(mockInputFocus).toHaveBeenCalledTimes(1);
      expect(mockInputFocus).toHaveBeenCalledWith(ids.CHASE_MAX_DISTANCE_INPUT);
    });

    it('connects every Scale input to a mounted keyboard accessory', () => {
      renderForm({ orderType: 'scale', scaleOrder: createScaleOrder() });

      [
        ids.SCALE_START_PRICE,
        ids.SCALE_END_PRICE,
        ids.SCALE_TOTAL_ORDERS,
        ids.SCALE_SIZE_SKEW,
      ].forEach((testID, index) => {
        expect(screen.getByTestId(testID)).toHaveProp(
          'inputAccessoryViewID',
          scaleAccessoryIDs[index],
        );
      });
      expect(mountedAccessoryIDs()).toHaveLength(7);
      expect(mountedAccessoryIDs()).toEqual(expectedAccessoryIDs);
    });

    it('binds pre-mounted Scale inputs on the first switch to Scale', () => {
      const view = renderForm({ orderType: 'market' });
      expect(screen.queryByTestId(ids.SCALE_START_PRICE)).not.toBeOnTheScreen();

      view.rerender(
        <PerpsProOrderForm
          {...createProps({
            orderType: 'scale',
            scaleOrder: createScaleOrder(),
          })}
        />,
      );

      expect(screen.getByTestId(ids.SCALE_START_PRICE)).toHaveProp(
        'inputAccessoryViewID',
        scaleAccessoryIDs[0],
      );
      fireEvent.press(
        screen.getByTestId(`${ids.KEYBOARD_NEXT}-${ids.SCALE_START_PRICE}`),
      );
      expect(mockInputFocus).toHaveBeenCalledWith(ids.SCALE_END_PRICE);
    });

    it('mounts the Chase max-distance keyboard accessory with the Chase form', () => {
      renderForm({ orderType: 'chase' });

      expect(screen.getByTestId(ids.CHASE_MAX_DISTANCE_INPUT)).toHaveProp(
        'inputAccessoryViewID',
        chaseMaxDistanceAccessoryID,
      );
      expect(mountedAccessoryIDs()).toEqual([
        ...expectedAccessoryIDs,
        chaseMaxDistanceAccessoryID,
      ]);
      expect(
        screen.getByTestId(
          `${ids.KEYBOARD_DONE}-${ids.CHASE_MAX_DISTANCE_INPUT}`,
        ),
      ).toBeOnTheScreen();
    });

    it('dismisses the keyboard from Done', () => {
      const dismissSpy = jest
        .spyOn(Keyboard, 'dismiss')
        .mockImplementation(jest.fn());
      renderForm();

      fireEvent.press(
        screen.getByTestId(`${ids.KEYBOARD_DONE}-${ids.SIZE_INPUT}`),
      );

      expect(dismissSpy).toHaveBeenCalledTimes(1);
    });

    it('routes Scale keyboard navigation and disables both boundaries', () => {
      renderForm({ orderType: 'scale', scaleOrder: createScaleOrder() });

      const firstPrevious = screen.getByTestId(
        `${ids.KEYBOARD_PREVIOUS}-${ids.SCALE_START_PRICE}`,
      );
      const firstNext = screen.getByTestId(
        `${ids.KEYBOARD_NEXT}-${ids.SCALE_START_PRICE}`,
      );
      const lastPrevious = screen.getByTestId(
        `${ids.KEYBOARD_PREVIOUS}-${ids.SCALE_SIZE_SKEW}`,
      );
      const lastNext = screen.getByTestId(
        `${ids.KEYBOARD_NEXT}-${ids.SCALE_SIZE_SKEW}`,
      );

      expect(firstPrevious).toBeDisabled();
      expect(lastNext).toBeDisabled();

      fireEvent.press(firstNext);
      fireEvent.press(lastPrevious);

      expect(mockInputFocus).toHaveBeenNthCalledWith(1, ids.SCALE_END_PRICE);
      expect(mockInputFocus).toHaveBeenNthCalledWith(2, ids.SCALE_TOTAL_ORDERS);
    });
  });

  describe('controls', () => {
    it('opens the Size skew explainer from the info button', () => {
      const scaleOrder = createScaleOrder();
      renderForm({ orderType: 'scale', scaleOrder });
      const infoButton = screen.getByTestId(ids.SCALE_SKEW_INFO);

      expect(infoButton).toHaveProp(
        'accessibilityLabel',
        strings('perps.pro_order_form.scale.size_skew'),
      );
      expect(infoButton).toHaveProp(
        'accessibilityHint',
        strings('perps.pro_order_form.scale.size_skew_hint'),
      );
      fireEvent.press(infoButton);

      expect(scaleOrder.onSizeSkewInfoPress).toHaveBeenCalledTimes(1);
    });

    it('renders the order type chevron from Figma', () => {
      renderForm();

      expect(screen.getByTestId(`${ids.ORDER_TYPE_BUTTON}-chevron`)).toHaveProp(
        'name',
        IconName.ArrowDown,
      );
    });

    it('reserves chevron width beside the Chase reference price', () => {
      renderForm({
        orderType: 'chase',
        chaseReferencePrice: '$123,456.78',
      });

      expect(
        screen.getByTestId(`${ids.ORDER_TYPE_BUTTON}-label-row`),
      ).toHaveStyle({
        flexGrow: 1,
        flexShrink: 1,
        minWidth: 0,
      });
      expect(
        screen.getByTestId(`${ids.ORDER_TYPE_BUTTON}-chevron`),
      ).toBeOnTheScreen();
      expect(screen.getByTestId(ids.CHASE_REFERENCE_PRICE)).toBeOnTheScreen();
    });

    it('renders the order type row at the Figma 54px height', () => {
      renderForm();

      expect(screen.getByTestId(ids.ORDER_TYPE_BUTTON)).toHaveStyle({
        height: 54,
      });
    });

    it('passes compact accessibility props to the size slider', () => {
      renderForm({
        sizeSlider: createSizeSlider({ value: 10, maximumValue: 43.55 }),
      });

      expect(screen.UNSAFE_getByType(host('PerpsSlider'))).toHaveProp(
        'variant',
        'compact',
      );
      expect(screen.UNSAFE_getByType(host('PerpsSlider'))).toHaveProp(
        'testID',
        ids.SIZE_SLIDER,
      );
      expect(screen.UNSAFE_getByType(host('PerpsSlider'))).toHaveProp(
        'accessibilityLabel',
        'Order size percentage (USD)',
      );
      expect(screen.UNSAFE_getByType(host('PerpsSlider'))).toHaveProp(
        'value',
        10,
      );
      expect(screen.UNSAFE_getByType(host('PerpsSlider'))).toHaveProp(
        'maximumValue',
        43.55,
      );
      expect(screen.UNSAFE_getByType(host('PerpsSlider'))).toHaveProp(
        'step',
        1,
      );
    });

    it('passes drag completion to the size slider', () => {
      const onDragEnd = jest.fn();
      renderForm({ sizeSlider: createSizeSlider({ onDragEnd }) });

      screen.UNSAFE_getByType(host('PerpsSlider')).props.onDragEnd();

      expect(onDragEnd).toHaveBeenCalledTimes(1);
    });

    it('enables the size denomination toggle when conversion is available', () => {
      renderForm({
        sizeInput: createSizeInput({ canToggleDenomination: true }),
      });

      expect(screen.getByTestId(ids.SIZE_UNIT_BUTTON)).toBeEnabled();
    });

    it('disables the size denomination toggle when conversion is unavailable', () => {
      renderForm({
        sizeInput: createSizeInput({ canToggleDenomination: false }),
      });

      expect(screen.getByTestId(ids.SIZE_UNIT_BUTTON)).toBeDisabled();
    });

    it('calls onDirectionChange when Short is pressed', () => {
      const onDirectionChange = jest.fn();
      renderForm({ onDirectionChange });

      fireEvent.press(screen.getByTestId(ids.DIRECTION_SHORT));

      expect(onDirectionChange).toHaveBeenCalledWith('short');
      expect(playSelection).toHaveBeenCalledTimes(1);
    });

    it('does not play a haptic when the current direction is re-selected', () => {
      const onDirectionChange = jest.fn();
      renderForm({ onDirectionChange, direction: 'long' });

      fireEvent.press(screen.getByTestId(ids.DIRECTION_LONG));

      expect(onDirectionChange).not.toHaveBeenCalled();
      expect(playSelection).not.toHaveBeenCalled();
    });

    it('calls onOrderTypeButtonPress when order type is pressed', () => {
      const onOrderTypeButtonPress = jest.fn();
      renderForm({ onOrderTypeButtonPress });

      fireEvent.press(screen.getByTestId(ids.ORDER_TYPE_BUTTON));

      expect(onOrderTypeButtonPress).toHaveBeenCalledTimes(1);
      expect(playSelection).toHaveBeenCalledTimes(1);
    });

    it('plays selection when the Mid price preset is pressed', () => {
      renderForm({ orderType: 'limit', onUseMidPricePress: jest.fn() });

      fireEvent.press(screen.getByTestId(ids.MID_PRICE_BUTTON));

      expect(playSelection).toHaveBeenCalledTimes(1);
    });

    it('exposes Reduce only with checked checkbox semantics', () => {
      renderForm({ reduceOnly: true });

      expect(screen.getByTestId(ids.REDUCE_ONLY)).toHaveProp(
        'accessibilityRole',
        'checkbox',
      );
      expect(screen.getByTestId(ids.REDUCE_ONLY)).toHaveProp(
        'accessibilityState',
        expect.objectContaining({ checked: true }),
      );
    });

    it('calls onReduceOnlyChange with the next checked value', () => {
      const onReduceOnlyChange = jest.fn();
      renderForm({ onReduceOnlyChange });

      fireEvent.press(screen.getByTestId(ids.REDUCE_ONLY));

      expect(onReduceOnlyChange).toHaveBeenCalledWith(true);
      expect(playSelection).toHaveBeenCalledTimes(1);
    });

    it('plays selection when the size denomination toggle is pressed', () => {
      const onToggleDenomination = jest.fn();
      renderForm({
        sizeInput: createSizeInput({
          canToggleDenomination: true,
          onToggleDenomination,
        }),
      });

      fireEvent.press(screen.getByTestId(ids.SIZE_UNIT_BUTTON));

      expect(onToggleDenomination).toHaveBeenCalledTimes(1);
      expect(playSelection).toHaveBeenCalledTimes(1);
    });

    it('hides the TP/SL row when Reduce Only is on', () => {
      renderForm({ reduceOnly: true, onTPSLPress: jest.fn() });

      expect(screen.queryByTestId(ids.TPSL)).not.toBeOnTheScreen();
    });

    it('exposes TP/SL as a button action with a down arrow affordance', () => {
      renderForm({ onTPSLPress: jest.fn() });

      expect(screen.getByTestId(ids.TPSL)).toHaveProp(
        'accessibilityRole',
        'button',
      );
      expect(screen.getByTestId(`${ids.TPSL}-arrow`)).toBeOnTheScreen();
    });

    it('calls onTPSLPress when TP/SL is pressed', () => {
      const onTPSLPress = jest.fn();
      renderForm({ onTPSLPress });

      fireEvent.press(screen.getByTestId(ids.TPSL));

      expect(onTPSLPress).toHaveBeenCalledTimes(1);
    });

    it('calls onPlaceOrderPress when Place Order is pressed', () => {
      const onPlaceOrderPress = jest.fn();
      renderForm({ onPlaceOrderPress });

      fireEvent.press(screen.getByTestId(ids.PLACE_ORDER_BUTTON));

      expect(onPlaceOrderPress).toHaveBeenCalledTimes(1);
    });

    it('exposes ready state on the existing Place Order label', () => {
      const view = renderForm();

      expect(screen.getByTestId(ids.PLACE_ORDER_READY)).toBeOnTheScreen();

      view.rerender(
        <PerpsProOrderForm {...createProps({ isPlaceOrderLoading: true })} />,
      );

      expect(screen.queryByTestId(ids.PLACE_ORDER_READY)).not.toBeOnTheScreen();
    });

    it('plays selection when leverage is opened', () => {
      const onLeveragePress = jest.fn();
      renderForm({ onLeveragePress });

      fireEvent.press(screen.getByTestId(ids.LEVERAGE_BUTTON));

      expect(onLeveragePress).toHaveBeenCalledTimes(1);
      expect(playSelection).toHaveBeenCalledTimes(1);
    });

    it('plays selection when the slippage summary value opens the sheet', () => {
      const onSlippagePress = jest.fn();
      renderForm({
        summary: {
          margin: '--',
          liquidationPrice: '--',
          slippage: '0.50% / 1%',
          onSlippagePress,
        },
      });

      fireEvent.press(screen.getByTestId(ids.SUMMARY_SLIPPAGE_BUTTON));

      expect(onSlippagePress).toHaveBeenCalledTimes(1);
      expect(playSelection).toHaveBeenCalledTimes(1);
    });

    it('keeps haptics silent when the slippage summary action is disabled', () => {
      renderForm({
        summary: {
          margin: '--',
          liquidationPrice: '--',
          slippage: '0.50% / 1%',
        },
      });

      fireEvent.press(screen.getByTestId(ids.SUMMARY_SLIPPAGE_BUTTON));

      expect(playSelection).not.toHaveBeenCalled();
    });

    it('disables Place Order when requested', () => {
      renderForm({ isPlaceOrderDisabled: true });

      expect(screen.getByTestId(ids.PLACE_ORDER_BUTTON)).toBeDisabled();
    });

    it.each([
      ['leverage', ids.LEVERAGE_BUTTON],
      ['size denomination', ids.SIZE_UNIT_BUTTON],
      ['Add funds', ids.ADD_FUNDS_BUTTON],
      ['TP/SL', ids.TPSL],
      ['slippage', ids.SUMMARY_SLIPPAGE_BUTTON],
      ['fees', ids.SUMMARY_FEES_BUTTON],
    ])('disables deferred %s action without a callback', (_name, testID) => {
      renderForm({
        orderType: 'limit',
        sizeInput: createSizeInput({ canToggleDenomination: false }),
        onAddFundsPress: undefined,
        onTPSLPress: undefined,
        onLeveragePress: undefined,
        summary: {
          margin: '--',
          liquidationPrice: '--',
          slippage: '--',
        },
      });

      expect(screen.getByTestId(testID)).toBeDisabled();
    });
  });

  describe('slippage edit control', () => {
    const slippageSummary = {
      margin: '--',
      liquidationPrice: '--',
      slippage: '0.50% / 1%',
    };

    const backgroundOf = (testID: string) =>
      StyleSheet.flatten(screen.getByTestId(testID).props.style)
        ?.backgroundColor;

    it('renders the slippage edit affordance as an icon-only button', () => {
      renderForm({
        summary: { ...slippageSummary, onSlippagePress: jest.fn() },
      });

      const editButton = screen.getByTestId(ids.SUMMARY_SLIPPAGE_BUTTON);

      expect(editButton).toBeOnTheScreen();
      expect(
        within(editButton).queryByText(slippageSummary.slippage),
      ).not.toBeOnTheScreen();
      expect(
        within(screen.getByTestId(ids.SUMMARY_SLIPPAGE)).getByText(
          slippageSummary.slippage,
        ),
      ).toBeOnTheScreen();
    });

    it('names the slippage edit affordance and keeps it reachable at the minimum tap size', () => {
      renderForm({
        summary: { ...slippageSummary, onSlippagePress: jest.fn() },
      });

      const editButton = screen.getByTestId(ids.SUMMARY_SLIPPAGE_BUTTON);

      expect(editButton).toHaveProp('accessibilityRole', 'button');
      expect(editButton).toHaveProp(
        'accessibilityLabel',
        strings('perps.slippage.config_title'),
      );
      expect(editButton).toHaveProp('hitSlop', 12);
    });

    it('applies a pressed background to the slippage edit affordance while held', () => {
      renderForm({
        summary: { ...slippageSummary, onSlippagePress: jest.fn() },
      });
      const restingBackground = backgroundOf(ids.SUMMARY_SLIPPAGE_BUTTON);

      fireEvent(screen.getByTestId(ids.SUMMARY_SLIPPAGE_BUTTON), 'pressIn');

      expect(backgroundOf(ids.SUMMARY_SLIPPAGE_BUTTON)).not.toBe(
        restingBackground,
      );
    });

    it('restores the resting background once the slippage edit affordance is released', () => {
      renderForm({
        summary: { ...slippageSummary, onSlippagePress: jest.fn() },
      });
      const restingBackground = backgroundOf(ids.SUMMARY_SLIPPAGE_BUTTON);
      fireEvent(screen.getByTestId(ids.SUMMARY_SLIPPAGE_BUTTON), 'pressIn');

      fireEvent(screen.getByTestId(ids.SUMMARY_SLIPPAGE_BUTTON), 'pressOut');

      expect(backgroundOf(ids.SUMMARY_SLIPPAGE_BUTTON)).toBe(restingBackground);
    });
  });

  describe('direction control', () => {
    it('fills the remaining row width whether or not the order book icon is shown', () => {
      const { rerender } = renderForm();

      expect(screen.getByTestId(ids.DIRECTION_CONTROL)).toHaveStyle({
        flexGrow: 1,
      });

      rerender(
        <PerpsProOrderForm {...createProps({ isOrderBookCollapsed: true })} />,
      );

      expect(screen.getByTestId(ids.DIRECTION_CONTROL)).toHaveStyle({
        flexGrow: 1,
      });
    });

    it('calls onDirectionChange when the order book icon is also shown', () => {
      const onDirectionChange = jest.fn();
      renderForm({ isOrderBookCollapsed: true, onDirectionChange });

      fireEvent.press(screen.getByTestId(ids.DIRECTION_SHORT));

      expect(onDirectionChange).toHaveBeenCalledWith('short');
    });
  });

  describe('order book expand icon', () => {
    it('omits the order book icon by default', () => {
      renderForm();

      expect(
        screen.queryByTestId(
          PerpsProMarketViewSelectorsIDs.ORDER_BOOK_EXPAND_BUTTON,
        ),
      ).not.toBeOnTheScreen();
    });

    it('renders the order book icon when the order book is collapsed', () => {
      renderForm({ isOrderBookCollapsed: true });

      expect(
        screen.getByTestId(
          PerpsProMarketViewSelectorsIDs.ORDER_BOOK_EXPAND_BUTTON,
        ),
      ).toBeOnTheScreen();
    });

    it('calls onExpandOrderBook when the order book icon is pressed', () => {
      const onExpandOrderBook = jest.fn();
      renderForm({ isOrderBookCollapsed: true, onExpandOrderBook });

      fireEvent.press(
        screen.getByTestId(
          PerpsProMarketViewSelectorsIDs.ORDER_BOOK_EXPAND_BUTTON,
        ),
      );

      expect(onExpandOrderBook).toHaveBeenCalledTimes(1);
      expect(playSelection).toHaveBeenCalledTimes(1);
    });
  });

  describe('conditional content', () => {
    it('omits Slippage when no display value is provided', () => {
      renderForm({
        summary: { margin: '--', liquidationPrice: '--' },
      });

      expect(screen.queryByTestId(ids.SUMMARY_SLIPPAGE)).not.toBeOnTheScreen();
    });

    it('renders an inline typed notice', () => {
      renderForm({
        notices: [{ id: 'risk', variant: 'inline', message: 'Risk warning' }],
      });

      expect(screen.getByTestId(`${ids.NOTICE}-risk`)).toHaveTextContent(
        'Risk warning',
      );
    });
  });

  describe('Figma layout', () => {
    it('uses 16-point spacing between form sections', () => {
      renderForm();

      expect(screen.getByTestId(ids.CONTAINER)).toHaveStyle({ gap: 16 });
    });

    it('left-aligns margin mode and leverage with 8-point spacing', () => {
      renderForm();

      expect(screen.getByTestId(ids.MARGIN_SETTINGS_ROW)).toHaveStyle({
        gap: 8,
      });
      expect(screen.getByTestId(ids.MARGIN_SETTINGS_ROW)).not.toHaveStyle({
        justifyContent: 'space-between',
      });
    });

    it('uses 4-point spacing between summary rows', () => {
      renderForm();

      expect(screen.getByTestId(ids.SUMMARY)).toHaveStyle({ gap: 4 });
    });

    it('uses 20-point summary row height', () => {
      renderForm();

      expect(screen.getByTestId(ids.SUMMARY_MARGIN)).toHaveStyle({
        height: 20,
      });
    });

    it('uses no horizontal padding on summary rows so they align with the form', () => {
      renderForm();

      expect(screen.getByTestId(ids.SUMMARY_MARGIN)).toHaveStyle({
        paddingHorizontal: 0,
      });
    });
  });

  describe('margin mode chip', () => {
    it('calls onMarginModePress when Isolated chip is pressed', () => {
      const onMarginModePress = jest.fn();
      renderForm({ onMarginModePress });

      fireEvent.press(screen.getByTestId(ids.MARGIN_MODE_BUTTON));

      expect(onMarginModePress).toHaveBeenCalledTimes(1);
    });

    it('renders the margin mode chip with the provided label', () => {
      renderForm({ marginModeLabel: 'Isolated', onMarginModePress: jest.fn() });

      expect(screen.getByTestId(ids.MARGIN_MODE_BUTTON)).toBeOnTheScreen();
    });
  });
});
