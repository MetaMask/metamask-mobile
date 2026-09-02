import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import {
  FilterButton,
  FilterButtonGroup,
  FilterButtonVariant,
  SelectButton,
  TextVariant,
} from '@metamask/design-system-react-native';
import { CandlePeriod } from '@metamask/perps-controller';
import CandlePeriodSelector, {
  getCandlePeriodLabel,
  type CandlePeriodOption,
} from './CandlePeriodSelector';
import renderWithProvider from '../../../../util/test/renderWithProvider';

const mockOnPeriodChange = jest.fn();
const mockOnMorePress = jest.fn();
const CUSTOM_CANDLE_PERIODS = [
  { label: '1m', value: CandlePeriod.OneMinute },
  { label: '1h', value: CandlePeriod.OneHour },
  { label: '1d', value: CandlePeriod.OneDay },
] as const satisfies readonly CandlePeriodOption[];

describe('CandlePeriodSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with default candle periods', () => {
    const { getByText } = renderWithProvider(
      <CandlePeriodSelector
        selectedPeriod={CandlePeriod.OneMinute}
        onPeriodChange={mockOnPeriodChange}
        onMorePress={mockOnMorePress}
      />,
      { state: { engine: { backgroundState: {} } } },
    );

    expect(getByText('1min')).toBeOnTheScreen();
    expect(getByText('3min')).toBeOnTheScreen();
    expect(getByText('5min')).toBeOnTheScreen();
    expect(getByText('15min')).toBeOnTheScreen();
  });

  it('calls onPeriodChange when period button is pressed', () => {
    const { getByText } = renderWithProvider(
      <CandlePeriodSelector
        selectedPeriod={CandlePeriod.OneMinute}
        onPeriodChange={mockOnPeriodChange}
        onMorePress={mockOnMorePress}
      />,
      { state: { engine: { backgroundState: {} } } },
    );

    fireEvent.press(getByText('3min'));

    expect(mockOnPeriodChange).toHaveBeenCalledWith(CandlePeriod.ThreeMinutes);
  });

  it('calls onMorePress when more button is pressed', () => {
    const testID = 'test-candle-selector';
    const { getByTestId } = renderWithProvider(
      <CandlePeriodSelector
        selectedPeriod={CandlePeriod.OneMinute}
        onPeriodChange={mockOnPeriodChange}
        onMorePress={mockOnMorePress}
        testID={testID}
      />,
      { state: { engine: { backgroundState: {} } } },
    );

    fireEvent.press(getByTestId(`${testID}-more-button`));

    expect(mockOnMorePress).toHaveBeenCalled();
  });

  it('displays selected period label in more button when non-default period is selected', () => {
    const { getByText } = renderWithProvider(
      <CandlePeriodSelector
        selectedPeriod={CandlePeriod.OneHour}
        onPeriodChange={mockOnPeriodChange}
        onMorePress={mockOnMorePress}
      />,
      { state: { engine: { backgroundState: {} } } },
    );

    expect(getByText('1h')).toBeOnTheScreen();
  });

  it('renders the configured visible periods', () => {
    const { getByText, queryByText } = renderWithProvider(
      <CandlePeriodSelector
        selectedPeriod={CandlePeriod.OneMinute}
        onPeriodChange={mockOnPeriodChange}
        onMorePress={mockOnMorePress}
        visiblePeriods={CUSTOM_CANDLE_PERIODS}
      />,
      { state: { engine: { backgroundState: {} } } },
    );

    expect(getByText('1m')).toBeOnTheScreen();
    expect(getByText('1h')).toBeOnTheScreen();
    expect(getByText('1d')).toBeOnTheScreen();
    expect(queryByText('3min')).not.toBeOnTheScreen();
  });

  it('routes configured period presses through onPeriodChange', () => {
    const { getByText } = renderWithProvider(
      <CandlePeriodSelector
        selectedPeriod={CandlePeriod.OneMinute}
        onPeriodChange={mockOnPeriodChange}
        onMorePress={mockOnMorePress}
        visiblePeriods={CUSTOM_CANDLE_PERIODS}
      />,
      { state: { engine: { backgroundState: {} } } },
    );

    fireEvent.press(getByText('1h'));

    expect(mockOnPeriodChange).toHaveBeenCalledWith(CandlePeriod.OneHour);
  });

  it('centers the default candle period group', () => {
    const testID = 'test-candle-selector';
    const { UNSAFE_getByType } = renderWithProvider(
      <CandlePeriodSelector
        selectedPeriod={CandlePeriod.OneMinute}
        testID={testID}
      />,
      { state: { engine: { backgroundState: {} } } },
    );

    expect(UNSAFE_getByType(FilterButtonGroup).props.twClassName).toBe(
      'gap-1 grow justify-center',
    );
  });

  it('applies a configured candle period group alignment', () => {
    const testID = 'test-candle-selector';
    const { UNSAFE_getByType } = renderWithProvider(
      <CandlePeriodSelector
        selectedPeriod={CandlePeriod.OneMinute}
        groupTwClassName="gap-1 grow justify-start"
        testID={testID}
      />,
      { state: { engine: { backgroundState: {} } } },
    );

    expect(UNSAFE_getByType(FilterButtonGroup).props.twClassName).toBe(
      'gap-1 grow justify-start',
    );
  });

  it('applies configured compact period-button styling', () => {
    const { UNSAFE_getAllByType, UNSAFE_getByType } = renderWithProvider(
      <CandlePeriodSelector
        selectedPeriod={CandlePeriod.OneMinute}
        filterVariant={FilterButtonVariant.Secondary}
        periodButtonTwClassName="h-7 rounded px-1"
        moreButtonTwClassName="h-7 rounded px-1"
        textVariant={TextVariant.BodyXs}
      />,
      { state: { engine: { backgroundState: {} } } },
    );

    const periodButton = UNSAFE_getAllByType(FilterButton)[0];
    const periodGroup = UNSAFE_getByType(FilterButtonGroup);
    const moreButton = UNSAFE_getByType(SelectButton);

    expect(periodGroup.props.variant).toBe(FilterButtonVariant.Secondary);
    expect(periodButton.props.twClassName).toBe('h-7 rounded px-1');
    expect(periodButton.props.textProps).toEqual({
      variant: TextVariant.BodyXs,
    });
    expect(moreButton.props.twClassName).toBe('h-7 rounded px-1');
    expect(moreButton.props.textProps).toEqual({
      variant: TextVariant.BodyXs,
    });
  });
});

describe('getCandlePeriodLabel', () => {
  it('resolves the label for known minute-scale periods', () => {
    expect(getCandlePeriodLabel(CandlePeriod.OneMinute)).toBe('1m');
    expect(getCandlePeriodLabel(CandlePeriod.FifteenMinutes)).toBe('15m');
  });

  it('resolves the label for known hour-scale periods', () => {
    expect(getCandlePeriodLabel(CandlePeriod.OneHour)).toBe('1h');
    expect(getCandlePeriodLabel(CandlePeriod.FourHours)).toBe('4h');
  });

  it('distinguishes 1m (minute) from 1M (month) using case-sensitive matching', () => {
    // Regression: previously a case-insensitive compare returned '1m' for '1M'.
    expect(getCandlePeriodLabel(CandlePeriod.OneMinute)).toBe('1m');
    expect(getCandlePeriodLabel(CandlePeriod.OneMonth)).toBe('1M');
  });

  it('falls back to the raw string for unknown periods', () => {
    expect(getCandlePeriodLabel('99z')).toBe('99z');
  });
});
