import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { initialState } from '../../_mocks_/initialState';
import {
  LIMIT_ORDER_NEAR_MARKET_PERCENT,
  LimitOrderExecutionType,
  LimitOrderPriceComparisonDirection,
} from '../../constants/limitOrders';
import { LimitOrderPriceAdjustCard } from './index';
import { LimitOrderPriceAdjustCardSelectorsIDs } from './testIds';
import { LimitOrderPriceAdjustInputSectionSelectorsIDs } from './InputSection/testIds';
import {
  getLimitOrderPercentPresetTestId,
  LimitOrderPriceAdjustPresetsSelectorsIDs,
} from './ButtonPricePresetsSection/testIds';

jest.mock('../../hooks/useAutoSizingFont', () => ({
  useAutoSizingFont: () => ({
    fontSize: 24,
    onContainerLayout: jest.fn(),
  }),
}));

const defaultProps = {
  orderSide: LimitOrderExecutionType.BUY,
  quoteTokenSymbol: 'USDC',
  isLimitFiatMode: true,
  limitPrice: '100',
  pricePresets: [5, 10],
  isCustomPercentActive: false,
  customPercent: '',
  onMarketPresetPress: jest.fn(),
  onPercentPresetPress: jest.fn(),
  onCustomPresetPress: jest.fn(),
};

function renderCard(
  overrides: Partial<
    React.ComponentProps<typeof LimitOrderPriceAdjustCard>
  > = {},
) {
  return renderWithProvider(
    <LimitOrderPriceAdjustCard {...defaultProps} {...overrides} />,
    { state: initialState },
  );
}

describe('LimitOrderPriceAdjustCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders input and preset sections', () => {
    const { getByTestId } = renderCard();

    expect(
      getByTestId(LimitOrderPriceAdjustCardSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      getByTestId(LimitOrderPriceAdjustInputSectionSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      getByTestId(LimitOrderPriceAdjustPresetsSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      getByTestId(LimitOrderPriceAdjustInputSectionSelectorsIDs.INPUT),
    ).toBeOnTheScreen();
    expect(getByTestId(getLimitOrderPercentPresetTestId(5))).toBeOnTheScreen();
  });

  it('calls onDismissKeypad when the dismiss area receives a release', () => {
    const onDismissKeypad = jest.fn();
    const { getByTestId } = renderCard({ onDismissKeypad });

    fireEvent(
      getByTestId(LimitOrderPriceAdjustCardSelectorsIDs.CONTAINER),
      'responderRelease',
    );

    expect(onDismissKeypad).toHaveBeenCalledTimes(1);
  });

  it('forwards limit price input press to the parent handler', () => {
    const onLimitPriceInputPress = jest.fn();
    const { getByTestId } = renderCard({ onLimitPriceInputPress });

    fireEvent(
      getByTestId(LimitOrderPriceAdjustInputSectionSelectorsIDs.INPUT),
      'pressIn',
    );

    expect(onLimitPriceInputPress).toHaveBeenCalledTimes(1);
  });

  it('forwards preset presses to the parent handlers', () => {
    const onMarketPresetPress = jest.fn();
    const onPercentPresetPress = jest.fn();
    const { getByTestId } = renderCard({
      onMarketPresetPress,
      onPercentPresetPress,
    });

    fireEvent.press(
      getByTestId(LimitOrderPriceAdjustPresetsSelectorsIDs.MARKET),
    );
    fireEvent.press(getByTestId(getLimitOrderPercentPresetTestId(5)));

    expect(onMarketPresetPress).toHaveBeenCalledTimes(1);
    expect(onPercentPresetPress).toHaveBeenCalledWith(5);
  });

  it('forwards the price comparison direction to the input section', () => {
    const { getByText } = renderCard({
      orderSide: LimitOrderExecutionType.BUY,
      priceComparisonDirection: LimitOrderPriceComparisonDirection.AT_OR_ABOVE,
    });

    expect(getByText(strings('bridge.limit.is_at_or_above'))).toBeOnTheScreen();
  });

  it('renders the near-market warning when the trigger price is near market', () => {
    const { getByTestId } = renderCard({ isTriggerPriceNearMarket: true });

    expect(
      getByTestId(LimitOrderPriceAdjustCardSelectorsIDs.NEAR_MARKET_WARNING),
    ).toHaveTextContent(
      strings('bridge.limit.trigger_price_near_market', {
        percent: LIMIT_ORDER_NEAR_MARKET_PERCENT,
      }),
    );
  });

  it('hides the near-market warning when the trigger price is not near market', () => {
    const { queryByTestId } = renderCard({ isTriggerPriceNearMarket: false });

    expect(
      queryByTestId(LimitOrderPriceAdjustCardSelectorsIDs.NEAR_MARKET_WARNING),
    ).toBeNull();
  });

  it('hides the near-market warning when the flag is omitted', () => {
    const { queryByTestId } = renderCard();

    expect(
      queryByTestId(LimitOrderPriceAdjustCardSelectorsIDs.NEAR_MARKET_WARNING),
    ).toBeNull();
  });
});
