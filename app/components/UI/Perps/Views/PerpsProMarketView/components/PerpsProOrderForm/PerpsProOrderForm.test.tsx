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
  onOrderTypeChange: jest.fn(),
  onOrderTypeButtonPress: jest.fn(),
  limitPrice: '',
  onLimitPriceChange: jest.fn(),
  size: '',
  onSizeChange: jest.fn(),
  balancePercentage: 0,
  onBalancePercentageChange: jest.fn(),
  availableBalance: 'Available balance: --',
  reduceOnly: false,
  onReduceOnlyChange: jest.fn(),
  isTPSLConfigured: false,
  onTPSLPress: jest.fn(),
  notices: [],
  summary: { margin: '--', liquidationPrice: '--', slippage: '--' },
  placeOrderLabel: 'Place order',
  placeOrderIntent: 'long',
  onPlaceOrderPress: jest.fn(),
  ...overrides,
});
const renderForm = (overrides: Partial<PerpsProOrderFormProps> = {}) =>
  render(<PerpsProOrderForm {...createProps(overrides)} />);
const expectIcon = (testID: string, name: string) =>
  expect(screen.getByTestId(testID)).toHaveProp('name', name);

describe('PerpsProOrderForm', () => {
  it('controls Limit Price visibility and passes raw native input text', () => {
    const onSizeChange = jest.fn();
    const onLimitPriceChange = jest.fn();
    const { rerender } = renderForm({
      orderType: 'limit',
      onSizeChange,
      onLimitPriceChange,
    });
    fireEvent.changeText(screen.getByTestId(ids.SIZE_INPUT), '1..2');
    fireEvent.changeText(screen.getByTestId(ids.LIMIT_PRICE_INPUT), '.123');
    expect(onSizeChange).toHaveBeenCalledWith('1..2');
    expect(onLimitPriceChange).toHaveBeenCalledWith('.123');
    expect(screen.getByTestId(ids.LIMIT_PRICE_INPUT)).toHaveProp(
      'placeholder',
      'Set limit price',
    );

    rerender(<PerpsProOrderForm {...createProps({ orderType: 'market' })} />);
    expect(screen.queryByTestId(ids.LIMIT_PRICE_INPUT)).not.toBeOnTheScreen();
  });

  it('renders the Figma control affordances', () => {
    renderForm({ orderType: 'limit', reduceOnly: true });

    expectIcon(`${ids.ORDER_TYPE_BUTTON}-chevron`, IconName.ArrowRight);
    // Selected indicator is now a Box with a Check icon inside
    expect(
      screen.getByTestId(`${ids.REDUCE_ONLY}-indicator`),
    ).toBeOnTheScreen();
    expect(screen.UNSAFE_getByType(host('PerpsSlider'))).toHaveProp(
      'variant',
      'compact',
    );
    expect(screen.getByTestId(ids.CONTAINER)).toHaveStyle({ gap: 16 });
    expect(screen.getByTestId(ids.SUMMARY)).toHaveStyle({ gap: 4 });
    expect(screen.getByTestId(ids.SUMMARY_MARGIN)).toHaveStyle({ height: 20 });
  });

  it('reports direction and calls order type button press callback', () => {
    const onDirectionChange = jest.fn();
    const onOrderTypeButtonPress = jest.fn();
    renderForm({ onDirectionChange, onOrderTypeButtonPress });
    fireEvent.press(screen.getByTestId(ids.DIRECTION_SHORT));
    fireEvent.press(screen.getByTestId(ids.ORDER_TYPE_BUTTON));
    expect(onDirectionChange).toHaveBeenCalledWith('short');
    expect(onOrderTypeButtonPress).toHaveBeenCalledTimes(1);
  });

  it('reports reduce-only, TP/SL, and Place Order actions', () => {
    const onReduceOnlyChange = jest.fn();
    const onTPSLPress = jest.fn();
    const onPlaceOrderPress = jest.fn();
    renderForm({ onReduceOnlyChange, onTPSLPress, onPlaceOrderPress });

    fireEvent.press(screen.getByTestId(ids.REDUCE_ONLY));
    fireEvent.press(screen.getByTestId(ids.TPSL));
    fireEvent.press(screen.getByTestId(ids.PLACE_ORDER_BUTTON));

    expect(onReduceOnlyChange).toHaveBeenCalledWith(true);
    expect(onTPSLPress).toHaveBeenCalledTimes(1);
    expect(onPlaceOrderPress).toHaveBeenCalledTimes(1);
  });

  it('keeps Slippage data-driven and renders typed notices', () => {
    renderForm({
      notices: [{ id: 'risk', variant: 'inline', message: 'Risk warning' }],
      summary: { margin: '--', liquidationPrice: '--' },
    });

    expect(screen.queryByTestId(ids.SUMMARY_SLIPPAGE)).not.toBeOnTheScreen();
    expect(screen.getByTestId(`${ids.NOTICE}-risk`)).toHaveTextContent(
      'Risk warning',
    );
  });
});
