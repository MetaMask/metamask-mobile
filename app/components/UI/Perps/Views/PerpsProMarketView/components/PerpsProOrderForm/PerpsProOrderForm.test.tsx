import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { IconName } from '@metamask/design-system-react-native';
import { PerpsProOrderFormSelectorsIDs } from '../../../../Perps.testIds';
import PerpsProOrderForm from './PerpsProOrderForm';
import type { PerpsProOrderFormProps } from './PerpsProOrderForm.types';

jest.mock('../../../../components/PerpsSlider', () => 'PerpsSlider');
jest.mock('../../../../components/PerpsFeesDisplay', () => 'PerpsFeesDisplay');

const host = (name: string) => name as unknown as React.ComponentType<unknown>;
const ids = PerpsProOrderFormSelectorsIDs;
const createProps = (
  overrides: Partial<PerpsProOrderFormProps> = {},
): PerpsProOrderFormProps => ({
  direction: 'long',
  onDirectionChange: jest.fn(),
  marginModeLabel: 'Isolated',
  leverageLabel: '3x',
  orderType: 'market',
  onOrderTypeButtonPress: jest.fn(),
  limitPrice: '',
  onLimitPriceChange: jest.fn(),
  size: '',
  onSizeChange: jest.fn(),
  balancePercentage: 0,
  onBalancePercentageChange: jest.fn(),
  availableBalance: '-- available',
  reduceOnly: false,
  onReduceOnlyChange: jest.fn(),
  isTPSLConfigured: false,
  notices: [],
  summary: { margin: '--', liquidationPrice: '--', slippage: '--' },
  placeOrderLabel: 'Place order',
  placeOrderIntent: 'long',
  onPlaceOrderPress: jest.fn(),
  ...overrides,
});
const renderForm = (overrides: Partial<PerpsProOrderFormProps> = {}) =>
  render(<PerpsProOrderForm {...createProps(overrides)} />);

describe('PerpsProOrderForm', () => {
  describe('inputs', () => {
    it('passes raw size text to onSizeChange', () => {
      const onSizeChange = jest.fn();
      renderForm({ onSizeChange });

      fireEvent.changeText(screen.getByTestId(ids.SIZE_INPUT), '1..2');

      expect(onSizeChange).toHaveBeenCalledWith('1..2');
    });

    it('passes raw limit price text to onLimitPriceChange', () => {
      const onLimitPriceChange = jest.fn();
      renderForm({ orderType: 'limit', onLimitPriceChange });

      fireEvent.changeText(screen.getByTestId(ids.LIMIT_PRICE_INPUT), '.123');

      expect(onLimitPriceChange).toHaveBeenCalledWith('.123');
    });

    it('renders limit price input for limit orders', () => {
      renderForm({ orderType: 'limit' });

      expect(screen.getByTestId(ids.LIMIT_PRICE_INPUT)).toBeOnTheScreen();
    });

    it('omits limit price input for market orders', () => {
      renderForm({ orderType: 'market' });

      expect(screen.queryByTestId(ids.LIMIT_PRICE_INPUT)).not.toBeOnTheScreen();
    });
  });

  describe('controls', () => {
    it('renders the order type chevron from Figma', () => {
      renderForm();

      expect(screen.getByTestId(`${ids.ORDER_TYPE_BUTTON}-chevron`)).toHaveProp(
        'name',
        IconName.ArrowRight,
      );
    });

    it('passes compact accessibility props to the size slider', () => {
      renderForm();

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
        'Order size percentage',
      );
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
      renderForm({ orderType: 'limit' });

      expect(screen.getByTestId(testID)).toBeDisabled();
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
  });
});
