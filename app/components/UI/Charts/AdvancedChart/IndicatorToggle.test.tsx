import React from 'react';
import { render, userEvent, screen } from '@testing-library/react-native';
import IndicatorToggle from './IndicatorToggle';
import type { IndicatorToggleProps } from './AdvancedChart.types';

const INDICATOR_CASES = [
  { type: 'MACD', label: 'MACD' },
  { type: 'RSI', label: 'RSI' },
  { type: 'MA200', label: 'MA(200)' },
] as const;

const createProps = (
  overrides: Partial<IndicatorToggleProps> = {},
): IndicatorToggleProps => ({
  activeIndicators: [],
  onToggle: jest.fn(),
  ...overrides,
});

const activeIndicatorTestCases = INDICATOR_CASES.map(({ type, label }) => ({
  type,
  label,
  active: true,
}));

const inactiveIndicatorTestCases = INDICATOR_CASES.map(({ type, label }) => ({
  type,
  label,
  active: false,
}));

describe('IndicatorToggle - active / inactive states', () => {
  it.each(activeIndicatorTestCases)(
    'marks $type as selected in accessibility state when active',
    ({ type, label }) => {
      const props = createProps({ activeIndicators: [type] });

      render(<IndicatorToggle {...props} />);

      expect(screen.getByText(label)).toBeOnTheScreen();
      expect(
        screen.getByLabelText(`${label} indicator enabled`),
      ).toBeOnTheScreen();
    },
  );

  it.each(inactiveIndicatorTestCases)(
    'marks $type as unselected in accessibility state when inactive',
    ({ type, label }) => {
      const props = createProps({
        activeIndicators: INDICATOR_CASES.map((c) => c.type).filter(
          (t) => t !== type,
        ),
      });

      render(<IndicatorToggle {...props} />);

      expect(screen.getByText(label)).toBeOnTheScreen();
      expect(
        screen.getByLabelText(`${label} indicator disabled`),
      ).toBeOnTheScreen();
    },
  );
});

describe('IndicatorToggle - onToggle', () => {
  it.each(INDICATOR_CASES)(
    'invokes onToggle with $type when $label is pressed',
    async ({ type, label }) => {
      const onToggle = jest.fn();
      const props = createProps({ onToggle });

      render(<IndicatorToggle {...props} />);

      await userEvent.press(
        screen.getByLabelText(`${label} indicator disabled`),
      );

      expect(onToggle).toHaveBeenCalledTimes(1);
      expect(onToggle).toHaveBeenCalledWith(type);
    },
  );

  it.each(INDICATOR_CASES)(
    'does not invoke onToggle disabled',
    async ({ label }) => {
      const onToggle = jest.fn();
      const props = createProps({ disabled: true, onToggle });

      render(<IndicatorToggle {...props} />);

      await userEvent.press(
        screen.getByLabelText(`${label} indicator disabled`),
      );

      expect(onToggle).not.toHaveBeenCalled();
    },
  );
});
