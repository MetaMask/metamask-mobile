import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { strings } from '../../../../../../../locales/i18n';
import { LimitOrderExecutionType } from '../../../constants/limitOrders';
import { ButtonPricePresetsSection } from './index';
import {
  getLimitOrderPercentPresetTestId,
  LimitOrderPriceAdjustPresetsSelectorsIDs,
} from './testIds';

const defaultProps = {
  executionType: LimitOrderExecutionType.BUY,
  pricePresets: [5, 10],
  isCustomActive: false,
  customValue: '',
  onMarketPress: jest.fn(),
  onPercentPress: jest.fn(),
  onCustomPress: jest.fn(),
};

function renderPresetsSection(
  overrides: Partial<
    React.ComponentProps<typeof ButtonPricePresetsSection>
  > = {},
) {
  return renderWithProvider(
    <ButtonPricePresetsSection {...defaultProps} {...overrides} />,
  );
}

describe('ButtonPricePresetsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders market and negative percent presets for buy orders', () => {
    const { getByTestId } = renderPresetsSection();

    expect(
      getByTestId(LimitOrderPriceAdjustPresetsSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      getByTestId(LimitOrderPriceAdjustPresetsSelectorsIDs.MARKET),
    ).toHaveTextContent(strings('bridge.limit.market'));
    expect(getByTestId(getLimitOrderPercentPresetTestId(5))).toHaveTextContent(
      '-5%',
    );
    expect(getByTestId(getLimitOrderPercentPresetTestId(10))).toHaveTextContent(
      '-10%',
    );
    expect(
      getByTestId(LimitOrderPriceAdjustPresetsSelectorsIDs.CUSTOM),
    ).toHaveTextContent(strings('bridge.limit.custom'));
  });

  it('renders positive percent presets for sell orders', () => {
    const { getByTestId } = renderPresetsSection({
      executionType: LimitOrderExecutionType.SELL,
    });

    expect(getByTestId(getLimitOrderPercentPresetTestId(5))).toHaveTextContent(
      '+5%',
    );
    expect(getByTestId(getLimitOrderPercentPresetTestId(10))).toHaveTextContent(
      '+10%',
    );
  });

  it('calls onMarketPress when the market preset is pressed', () => {
    const onMarketPress = jest.fn();
    const { getByTestId } = renderPresetsSection({ onMarketPress });

    fireEvent.press(
      getByTestId(LimitOrderPriceAdjustPresetsSelectorsIDs.MARKET),
    );

    expect(onMarketPress).toHaveBeenCalledTimes(1);
  });

  it('calls onPercentPress with the preset value when a percent button is pressed', () => {
    const onPercentPress = jest.fn();
    const { getByTestId } = renderPresetsSection({ onPercentPress });

    fireEvent.press(getByTestId(getLimitOrderPercentPresetTestId(10)));

    expect(onPercentPress).toHaveBeenCalledWith(10);
  });

  it('calls onCustomPress when the custom preset is pressed', () => {
    const onCustomPress = jest.fn();
    const { getByTestId } = renderPresetsSection({ onCustomPress });

    fireEvent.press(
      getByTestId(LimitOrderPriceAdjustPresetsSelectorsIDs.CUSTOM),
    );

    expect(onCustomPress).toHaveBeenCalledTimes(1);
  });

  it('renders custom percent input when custom mode is active', () => {
    const onCustomInputPress = jest.fn();
    const { getByTestId, queryByTestId } = renderPresetsSection({
      isCustomActive: true,
      customValue: '7',
      onCustomInputPress,
    });

    expect(
      queryByTestId(LimitOrderPriceAdjustPresetsSelectorsIDs.CUSTOM),
    ).not.toBeOnTheScreen();
    expect(
      getByTestId(LimitOrderPriceAdjustPresetsSelectorsIDs.CUSTOM_INPUT),
    ).toBeOnTheScreen();

    fireEvent(
      getByTestId(LimitOrderPriceAdjustPresetsSelectorsIDs.CUSTOM_INPUT),
      'pressIn',
    );

    expect(onCustomInputPress).toHaveBeenCalledTimes(1);
  });
});
