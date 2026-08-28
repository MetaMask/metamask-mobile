import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { initialState } from '../../_mocks_/initialState';
import { LimitOrderExecutionType } from '../../constants/limitOrders';
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
});
