import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { PerpsProOrderFormSelectorsIDs } from '../../../../Perps.testIds';
import PerpsProOrderForm from './PerpsProOrderForm';
import type { PerpsProOrderFormProps } from './PerpsProOrderForm.types';
jest.mock('../../../../components/PerpsSlider', () => 'PerpsSlider');
jest.mock('../../../../components/PerpsFeesDisplay', () => 'PerpsFeesDisplay');
jest.mock(
  '../../../../components/PerpsOrderTypeBottomSheet/PerpsOrderTypeBottomSheetView',
  () => 'PerpsOrderTypeBottomSheetView',
);
const host = (name: string) => name as unknown as React.ComponentType<unknown>;
const createProps = (
  overrides: Partial<PerpsProOrderFormProps> = {},
): PerpsProOrderFormProps => ({
  direction: 'long',
  onDirectionChange: jest.fn(),
  marginModeLabel: 'Isolated',
  leverageLabel: '3x',
  orderType: 'market',
  onOrderTypeChange: jest.fn(),
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
  summary: {
    margin: '--',
    liquidationPrice: '--',
    slippage: '--',
  },
  placeOrderLabel: 'Place order',
  placeOrderIntent: 'long',
  onPlaceOrderPress: jest.fn(),
  ...overrides,
});
describe('PerpsProOrderForm', () => {
  it('controls Limit Price visibility and passes raw native input text', () => {
    const onSizeChange = jest.fn();
    const onLimitPriceChange = jest.fn();
    const { rerender } = render(
      <PerpsProOrderForm
        {...createProps({
          orderType: 'limit',
          onSizeChange,
          onLimitPriceChange,
        })}
      />,
    );
    fireEvent.changeText(
      screen.getByTestId(PerpsProOrderFormSelectorsIDs.SIZE_INPUT),
      '1..2',
    );
    fireEvent.changeText(
      screen.getByTestId(PerpsProOrderFormSelectorsIDs.LIMIT_PRICE_INPUT),
      '.123',
    );
    expect(onSizeChange).toHaveBeenCalledWith('1..2');
    expect(onLimitPriceChange).toHaveBeenCalledWith('.123');

    rerender(<PerpsProOrderForm {...createProps({ orderType: 'market' })} />);
    expect(
      screen.queryByTestId(PerpsProOrderFormSelectorsIDs.LIMIT_PRICE_INPUT),
    ).not.toBeOnTheScreen();
  });

  it('reports direction and shared order-type selections', () => {
    const onDirectionChange = jest.fn();
    const onOrderTypeChange = jest.fn();
    render(
      <PerpsProOrderForm
        {...createProps({
          onDirectionChange,
          onOrderTypeChange,
        })}
      />,
    );
    fireEvent.press(
      screen.getByTestId(PerpsProOrderFormSelectorsIDs.DIRECTION_SHORT),
    );
    fireEvent.press(
      screen.getByTestId(PerpsProOrderFormSelectorsIDs.ORDER_TYPE_BUTTON),
    );
    fireEvent(
      screen.UNSAFE_getByType(host('PerpsOrderTypeBottomSheetView')),
      'onSelect',
      'limit',
    );
    expect(onDirectionChange).toHaveBeenCalledWith('short');
    expect(onOrderTypeChange).toHaveBeenCalledWith('limit');
    expect(
      screen.UNSAFE_getByType(host('PerpsOrderTypeBottomSheetView')),
    ).toHaveProp('isVisible', false);
  });

  it('reports reduce-only, TP/SL, and Place Order actions', () => {
    const onReduceOnlyChange = jest.fn();
    const onTPSLPress = jest.fn();
    const onPlaceOrderPress = jest.fn();
    render(
      <PerpsProOrderForm
        {...createProps({
          onReduceOnlyChange,
          onTPSLPress,
          onPlaceOrderPress,
        })}
      />,
    );

    fireEvent.press(
      screen.getByTestId(PerpsProOrderFormSelectorsIDs.REDUCE_ONLY),
    );
    fireEvent.press(screen.getByTestId(PerpsProOrderFormSelectorsIDs.TPSL));
    fireEvent.press(
      screen.getByTestId(PerpsProOrderFormSelectorsIDs.PLACE_ORDER_BUTTON),
    );

    expect(onReduceOnlyChange).toHaveBeenCalledWith(true);
    expect(onTPSLPress).toHaveBeenCalledTimes(1);
    expect(onPlaceOrderPress).toHaveBeenCalledTimes(1);
  });

  it('keeps Slippage data-driven and renders typed notices', () => {
    render(
      <PerpsProOrderForm
        {...createProps({
          notices: [{ id: 'risk', variant: 'inline', message: 'Risk warning' }],
          summary: {
            margin: '--',
            liquidationPrice: '--',
          },
        })}
      />,
    );

    expect(
      screen.queryByTestId(PerpsProOrderFormSelectorsIDs.SUMMARY_SLIPPAGE),
    ).not.toBeOnTheScreen();
    expect(
      screen.getByTestId(`${PerpsProOrderFormSelectorsIDs.NOTICE}-risk`),
    ).toHaveTextContent('Risk warning');
  });
});
