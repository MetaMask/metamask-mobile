import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { IconName } from '@metamask/design-system-react-native';
import { Keyboard } from 'react-native';
import {
  PerpsProMarketViewSelectorsIDs,
  PerpsProOrderFormSelectorsIDs,
} from '../../../../Perps.testIds';
import { getPerpsProInputAccessoryID } from './PerpsProCompactInput';
import PerpsProOrderForm from './PerpsProOrderForm';
import type { PerpsProOrderFormProps } from './PerpsProOrderForm.types';

jest.mock('../../../../components/PerpsSlider', () => 'PerpsSlider');
jest.mock('../../../../components/PerpsFeesDisplay', () => 'PerpsFeesDisplay');

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
    onOrderTypeButtonPress: jest.fn(),
    limitPrice: '',
    onLimitPriceChange: jest.fn(),
    onLimitPriceBlur: jest.fn(),
    sizeInput: createSizeInput(sizeInput),
    sizeSlider: createSizeSlider(sizeSlider),
    availableBalance: '-- available',
    reduceOnly: false,
    onReduceOnlyChange: jest.fn(),
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

describe('PerpsProOrderForm', () => {
  describe('inputs', () => {
    it('passes raw size text to sizeInput.onChange', () => {
      const onChange = jest.fn();
      renderForm({ sizeInput: createSizeInput({ onChange }) });

      fireEvent.changeText(screen.getByTestId(ids.SIZE_INPUT), '1..2');

      expect(onChange).toHaveBeenCalledWith('1..2');
    });

    it('passes raw limit price text to onLimitPriceChange', () => {
      const onLimitPriceChange = jest.fn();
      renderForm({ orderType: 'limit', onLimitPriceChange });

      fireEvent.changeText(screen.getByTestId(ids.LIMIT_PRICE_INPUT), '.123');

      expect(onLimitPriceChange).toHaveBeenCalledWith('.123');
    });

    it('wires limit price blur to onLimitPriceBlur', () => {
      const onLimitPriceBlur = jest.fn();
      renderForm({ orderType: 'limit', onLimitPriceBlur });

      fireEvent(screen.getByTestId(ids.LIMIT_PRICE_INPUT), 'blur');

      expect(onLimitPriceBlur).toHaveBeenCalledTimes(1);
    });

    it('renders limit price input for limit orders', () => {
      renderForm({ orderType: 'limit' });

      expect(screen.getByTestId(ids.LIMIT_PRICE_INPUT)).toBeOnTheScreen();
    });

    it('renders the dollar prefix for limit prices', () => {
      renderForm({ orderType: 'limit' });

      expect(screen.getByTestId(ids.LIMIT_PRICE_PREFIX)).toHaveTextContent('$');
    });

    it('omits limit price input for market orders', () => {
      renderForm({ orderType: 'market' });

      expect(screen.queryByTestId(ids.LIMIT_PRICE_INPUT)).not.toBeOnTheScreen();
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
    });

    it('connects each iOS numeric input to its own keyboard accessory', () => {
      renderForm({ orderType: 'limit' });

      const sizeAccessoryID = getPerpsProInputAccessoryID(ids.SIZE_INPUT);
      const limitPriceAccessoryID = getPerpsProInputAccessoryID(
        ids.LIMIT_PRICE_INPUT,
      );

      expect(screen.getByTestId(ids.SIZE_INPUT)).toHaveProp(
        'inputAccessoryViewID',
        sizeAccessoryID,
      );
      expect(screen.getByTestId(ids.LIMIT_PRICE_INPUT)).toHaveProp(
        'inputAccessoryViewID',
        limitPriceAccessoryID,
      );
      expect(sizeAccessoryID).not.toBe(limitPriceAccessoryID);
      expect(
        screen
          .UNSAFE_getAllByType(host('RCTInputAccessoryView'))
          .map((accessory) => accessory.props.nativeID),
      ).toEqual([sizeAccessoryID, limitPriceAccessoryID]);
    });

    it('dismisses the keyboard from the custom minimize control', () => {
      const dismissSpy = jest
        .spyOn(Keyboard, 'dismiss')
        .mockImplementation(jest.fn());
      renderForm();

      fireEvent.press(
        screen.getByTestId(`${ids.KEYBOARD_CLOSE}-${ids.SIZE_INPUT}`),
      );

      expect(dismissSpy).toHaveBeenCalledTimes(1);
      dismissSpy.mockRestore();
    });
  });

  describe('controls', () => {
    it('renders the order type chevron from Figma', () => {
      renderForm();

      expect(screen.getByTestId(`${ids.ORDER_TYPE_BUTTON}-chevron`)).toHaveProp(
        'name',
        IconName.ArrowDown,
      );
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

      expect(screen.UNSAFE_getByType(host('PerpsSlider'))).toHaveProp(
        'onDragEnd',
        onDragEnd,
      );
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
    });

    it('calls onOrderTypeButtonPress when order type is pressed', () => {
      const onOrderTypeButtonPress = jest.fn();
      renderForm({ onOrderTypeButtonPress });

      fireEvent.press(screen.getByTestId(ids.ORDER_TYPE_BUTTON));

      expect(onOrderTypeButtonPress).toHaveBeenCalledTimes(1);
    });

    it('exposes Reduce only with checked checkbox semantics', () => {
      renderForm({ reduceOnly: true });

      expect(screen.getByTestId(ids.REDUCE_ONLY)).toHaveProp(
        'accessibilityRole',
        'checkbox',
      );
      expect(screen.getByTestId(ids.REDUCE_ONLY)).toHaveProp(
        'accessibilityState',
        { checked: true },
      );
    });

    it('calls onReduceOnlyChange with the next checked value', () => {
      const onReduceOnlyChange = jest.fn();
      renderForm({ onReduceOnlyChange });

      fireEvent.press(screen.getByTestId(ids.REDUCE_ONLY));

      expect(onReduceOnlyChange).toHaveBeenCalledWith(true);
    });

    it('exposes TP/SL as a button action', () => {
      renderForm({ onTPSLPress: jest.fn() });

      expect(screen.getByTestId(ids.TPSL)).toHaveProp(
        'accessibilityRole',
        'button',
      );
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

    it('calls onSlippagePress when the slippage value is pressed', () => {
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
    });

    it('disables Place Order when requested', () => {
      renderForm({ isPlaceOrderDisabled: true });

      expect(screen.getByTestId(ids.PLACE_ORDER_BUTTON)).toBeDisabled();
    });

    it.each([
      ['leverage', ids.LEVERAGE_BUTTON],
      ['Mid price', ids.MID_PRICE_BUTTON],
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
        onUseMidPricePress: undefined,
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

    it('left-aligns margin mode and leverage with 16-point spacing', () => {
      renderForm();

      expect(screen.getByTestId(ids.MARGIN_SETTINGS_ROW)).toHaveStyle({
        gap: 16,
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

      expect(screen.getByTestId(ids.MARGIN_MODE_BUTTON)).toBeTruthy();
    });
  });
});
