import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { strings } from '../../../../../../../locales/i18n';
import { initialState } from '../../../_mocks_/initialState';
import { LimitOrderExecutionType } from '../../../constants/limitOrders';
import { InputSection } from './index';
import { LimitOrderPriceAdjustInputSectionSelectorsIDs } from './testIds';

jest.mock('../../../hooks/useAutoSizingFont', () => ({
  useAutoSizingFont: () => ({
    fontSize: 24,
    onContainerLayout: jest.fn(),
  }),
}));

function renderInputSection(
  overrides: Partial<React.ComponentProps<typeof InputSection>> = {},
) {
  return renderWithProvider(
    <InputSection
      executionType={LimitOrderExecutionType.BUY}
      isLimitFiatMode
      value="100"
      {...overrides}
    />,
    { state: initialState },
  );
}

describe('InputSection', () => {
  it('renders buy copy and quoted token unit for buy orders', () => {
    const { getByTestId, getByText } = renderInputSection({
      quotedSymbol: 'USDC',
    });

    expect(
      getByTestId(LimitOrderPriceAdjustInputSectionSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    expect(getByText(strings('bridge.limit.buy_when'))).toBeOnTheScreen();
    expect(
      getByTestId(LimitOrderPriceAdjustInputSectionSelectorsIDs.QUOTE_UNIT),
    ).toHaveTextContent(
      strings('bridge.limit.quote_unit', { amount: 1, symbol: 'USDC' }),
    );
    expect(getByText(strings('bridge.limit.is_at_or_below'))).toBeOnTheScreen();
  });

  it('renders sell copy for sell orders', () => {
    const { getByText } = renderInputSection({
      executionType: LimitOrderExecutionType.SELL,
      quotedSymbol: 'ETH',
    });

    expect(getByText(strings('bridge.limit.sell_when'))).toBeOnTheScreen();
    expect(getByText(strings('bridge.limit.is_at_or_above'))).toBeOnTheScreen();
  });

  it('calls quote unit and dismiss handlers when the quote unit is pressed', () => {
    const onQuoteUnitPress = jest.fn();
    const onDismissKeypad = jest.fn();
    const { getByTestId } = renderInputSection({
      quotedSymbol: 'USDC',
      onQuoteUnitPress,
      onDismissKeypad,
    });

    fireEvent.press(
      getByTestId(LimitOrderPriceAdjustInputSectionSelectorsIDs.QUOTE_UNIT),
    );

    expect(onDismissKeypad).toHaveBeenCalledTimes(1);
    expect(onQuoteUnitPress).toHaveBeenCalledTimes(1);
  });

  it('calls onInputPress when the limit price input is pressed', () => {
    const onInputPress = jest.fn();
    const { getByTestId } = renderInputSection({ onInputPress });

    fireEvent(
      getByTestId(LimitOrderPriceAdjustInputSectionSelectorsIDs.INPUT),
      'pressIn',
    );

    expect(onInputPress).toHaveBeenCalledTimes(1);
  });

  it('renders secondary value and market comparison labels', () => {
    const { getByTestId } = renderInputSection({
      secondaryValue: '0.05 ETH',
      marketComparison: {
        label: '(-5.00% from market)',
        isNegative: true,
      },
      onAmountTypeTogglePress: jest.fn(),
    });

    expect(
      getByTestId(
        LimitOrderPriceAdjustInputSectionSelectorsIDs.SECONDARY_VALUE,
      ),
    ).toHaveTextContent('≈ 0.05 ETH');
    expect(
      getByTestId(
        LimitOrderPriceAdjustInputSectionSelectorsIDs.MARKET_COMPARISON,
      ),
    ).toHaveTextContent('(-5.00% from market)');
  });

  it('calls amount type toggle and dismiss handlers when secondary row is pressed', () => {
    const onAmountTypeTogglePress = jest.fn();
    const onDismissKeypad = jest.fn();
    const { getByTestId } = renderInputSection({
      secondaryValue: '0.05 ETH',
      onAmountTypeTogglePress,
      onDismissKeypad,
    });

    fireEvent.press(
      getByTestId(
        LimitOrderPriceAdjustInputSectionSelectorsIDs.AMOUNT_TYPE_TOGGLE,
      ),
    );

    expect(onDismissKeypad).toHaveBeenCalledTimes(1);
    expect(onAmountTypeTogglePress).toHaveBeenCalledTimes(1);
  });
});
