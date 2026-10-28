import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { GlassView } from 'expo-glass-effect';
import PerpsEmptyBalance from './PerpsEmptyBalance';
import { PerpsMarketBalanceActionsSelectorsIDs } from '../../Perps.testIds';

// The glass tests need the OS to draw glass, which Jest can't.
jest.mock('../../../../../component-library/hooks/useLiquidGlass', () => {
  const actual = jest.requireActual(
    '../../../../../component-library/hooks/useLiquidGlass',
  );
  return {
    ...actual,
    useLiquidGlass: () => ({
      ...actual.useLiquidGlass(),
      isGlassEnabled: true,
    }),
  };
});

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const mockStrings: Record<string, string> = {
      'perps.add_funds': 'Add funds',
    };
    return mockStrings[key] ?? key;
  }),
}));

describe('PerpsEmptyBalance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders $0.00 balance text', () => {
      const onAddFunds = jest.fn();

      const { getByText } = render(
        <PerpsEmptyBalance onAddFunds={onAddFunds} />,
      );

      expect(getByText('$0.00')).toBeTruthy();
    });

    it('renders balance value with correct testID', () => {
      const onAddFunds = jest.fn();

      const { getByTestId } = render(
        <PerpsEmptyBalance onAddFunds={onAddFunds} />,
      );

      expect(
        getByTestId(PerpsMarketBalanceActionsSelectorsIDs.BALANCE_VALUE),
      ).toBeTruthy();
    });

    it('renders Add funds button', () => {
      const onAddFunds = jest.fn();

      const { getByText } = render(
        <PerpsEmptyBalance onAddFunds={onAddFunds} />,
      );

      expect(getByText('Add funds')).toBeTruthy();
    });

    it('renders Add funds button with correct testID', () => {
      const onAddFunds = jest.fn();

      const { getByTestId } = render(
        <PerpsEmptyBalance onAddFunds={onAddFunds} />,
      );

      expect(
        getByTestId(PerpsMarketBalanceActionsSelectorsIDs.ADD_FUNDS_BUTTON),
      ).toBeTruthy();
    });
  });

  describe('onAddFunds callback', () => {
    it('calls onAddFunds when Add funds button is pressed', () => {
      const onAddFunds = jest.fn();

      const { getByTestId } = render(
        <PerpsEmptyBalance onAddFunds={onAddFunds} />,
      );

      fireEvent.press(
        getByTestId(PerpsMarketBalanceActionsSelectorsIDs.ADD_FUNDS_BUTTON),
      );

      expect(onAddFunds).toHaveBeenCalledTimes(1);
    });

    it('calls onAddFunds each time Add funds button is pressed', () => {
      const onAddFunds = jest.fn();

      const { getByTestId } = render(
        <PerpsEmptyBalance onAddFunds={onAddFunds} />,
      );

      const addFundsButton = getByTestId(
        PerpsMarketBalanceActionsSelectorsIDs.ADD_FUNDS_BUTTON,
      );

      fireEvent.press(addFundsButton);
      fireEvent.press(addFundsButton);

      expect(onAddFunds).toHaveBeenCalledTimes(2);
    });
  });

  describe('glass', () => {
    it('keeps the solid primary button by default', () => {
      const { UNSAFE_queryAllByType } = render(
        <PerpsEmptyBalance onAddFunds={jest.fn()} />,
      );

      expect(UNSAFE_queryAllByType(GlassView)).toHaveLength(0);
    });

    it('keeps Add funds as the solid primary button when glass is on', () => {
      const onAddFunds = jest.fn();
      const { UNSAFE_queryAllByType, getByTestId } = render(
        <PerpsEmptyBalance onAddFunds={onAddFunds} isGlass />,
      );

      expect(UNSAFE_queryAllByType(GlassView)).toHaveLength(0);

      fireEvent.press(
        getByTestId(PerpsMarketBalanceActionsSelectorsIDs.ADD_FUNDS_BUTTON),
      );

      expect(onAddFunds).toHaveBeenCalledTimes(1);
    });
  });
});
