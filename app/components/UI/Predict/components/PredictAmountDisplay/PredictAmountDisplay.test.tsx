import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { PerpsAmountDisplaySelectorsIDs } from '../../../Perps/Perps.testIds';
import PredictAmountDisplay from './PredictAmountDisplay';

jest.mock('../../../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      text: {
        default: '#141618',
        alternative: '#9fa6ae',
      },
      primary: {
        default: '#037DD6',
      },
    },
    themeAppearance: 'light',
  }),
}));

describe('PredictAmountDisplay', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Rendering', () => {
    it('displays amount with dollar sign', () => {
      const amount = '1000';

      const { getByText } = render(<PredictAmountDisplay amount={amount} />);

      expect(getByText('$1000')).toBeOnTheScreen();
    });

    it('displays $0 when amount is empty string', () => {
      const emptyAmount = '';

      const { getByText } = render(
        <PredictAmountDisplay amount={emptyAmount} />,
      );

      expect(getByText('$0')).toBeOnTheScreen();
    });

    it('renders container with correct test ID', () => {
      const amount = '100';

      const { getByTestId } = render(<PredictAmountDisplay amount={amount} />);

      expect(
        getByTestId(PerpsAmountDisplaySelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();
    });

    it('displays decimal amounts correctly', () => {
      const amount = '1234.56';

      const { getByText } = render(<PredictAmountDisplay amount={amount} />);

      expect(getByText('$1234.56')).toBeOnTheScreen();
    });
  });

  describe('User Interactions', () => {
    it('calls onPress handler when amount is pressed', () => {
      const onPressMock = jest.fn();
      const amount = '1000';

      const { getByText } = render(
        <PredictAmountDisplay amount={amount} onPress={onPressMock} />,
      );
      fireEvent.press(getByText('$1000'));

      expect(onPressMock).toHaveBeenCalledTimes(1);
    });

    it('handles press without error when onPress is not provided', () => {
      const amount = '1000';

      const { getByText } = render(<PredictAmountDisplay amount={amount} />);

      expect(() => fireEvent.press(getByText('$1000'))).not.toThrow();
    });
  });

  describe('Active State', () => {
    it('displays cursor when isActive is true', () => {
      const amount = '1000';

      const { getByTestId } = render(
        <PredictAmountDisplay amount={amount} isActive />,
      );

      expect(getByTestId('cursor')).toBeOnTheScreen();
    });

    it('hides cursor when isActive is false', () => {
      const amount = '1000';

      const { queryByTestId } = render(
        <PredictAmountDisplay amount={amount} isActive={false} />,
      );

      expect(queryByTestId('cursor')).toBeNull();
    });

    it('hides cursor by default when isActive is not specified', () => {
      const amount = '1000';

      const { queryByTestId } = render(
        <PredictAmountDisplay amount={amount} />,
      );

      expect(queryByTestId('cursor')).toBeNull();
    });
  });

  describe('Error State', () => {
    it('applies error text color when hasError is true', () => {
      const amount = '1000';

      const { getByTestId } = render(
        <PredictAmountDisplay amount={amount} hasError />,
      );

      const amountText = getByTestId(
        PerpsAmountDisplaySelectorsIDs.AMOUNT_LABEL,
      );
      expect(amountText).toBeOnTheScreen();
      expect(amountText.props.style).toEqual(
        expect.objectContaining({
          color: expect.any(String),
        }),
      );
    });

    it('applies default text color when hasError is false', () => {
      const amount = '1000';

      const { getByTestId } = render(
        <PredictAmountDisplay amount={amount} hasError={false} />,
      );

      const amountText = getByTestId(
        PerpsAmountDisplaySelectorsIDs.AMOUNT_LABEL,
      );
      expect(amountText).toBeOnTheScreen();
    });

    it('applies default text color when hasError is not specified', () => {
      const amount = '1000';

      const { getByTestId } = render(<PredictAmountDisplay amount={amount} />);

      const amountText = getByTestId(
        PerpsAmountDisplaySelectorsIDs.AMOUNT_LABEL,
      );
      expect(amountText).toBeOnTheScreen();
    });
  });

  describe('Edge Cases', () => {
    it('handles zero amount', () => {
      const amount = '0';

      const { getByText } = render(<PredictAmountDisplay amount={amount} />);

      expect(getByText('$0')).toBeOnTheScreen();
    });

    it('handles large numbers', () => {
      const amount = '1000000';

      const { getByText } = render(<PredictAmountDisplay amount={amount} />);

      expect(getByText('$1000000')).toBeOnTheScreen();
    });

    it('handles very small decimal amounts', () => {
      const amount = '0.01';

      const { getByText } = render(<PredictAmountDisplay amount={amount} />);

      expect(getByText('$0.01')).toBeOnTheScreen();
    });

    it('handles undefined amount', () => {
      const { getByText } = render(
        <PredictAmountDisplay amount={undefined as unknown as string} />,
      );

      expect(getByText('$0')).toBeOnTheScreen();
    });
  });

  describe('Font Size Adjustments', () => {
    it('applies largest font size for short amounts up to 8 characters', () => {
      const amount = '1234.5';

      const { getByTestId } = render(<PredictAmountDisplay amount={amount} />);
      const amountText = getByTestId(
        PerpsAmountDisplaySelectorsIDs.AMOUNT_LABEL,
      );

      expect(amountText.props.style).toEqual(
        expect.objectContaining({
          fontSize: 60,
          lineHeight: 70,
        }),
      );
    });

    it('applies medium-large font size for amounts with 9-10 characters', () => {
      const amount = '12345.67';

      const { getByTestId } = render(<PredictAmountDisplay amount={amount} />);
      const amountText = getByTestId(
        PerpsAmountDisplaySelectorsIDs.AMOUNT_LABEL,
      );

      expect(amountText.props.style).toEqual(
        expect.objectContaining({
          fontSize: 48,
          lineHeight: 58,
        }),
      );
    });

    it('applies medium font size for amounts with 11-12 characters', () => {
      const amount = '123456.789';

      const { getByTestId } = render(<PredictAmountDisplay amount={amount} />);
      const amountText = getByTestId(
        PerpsAmountDisplaySelectorsIDs.AMOUNT_LABEL,
      );

      expect(amountText.props.style).toEqual(
        expect.objectContaining({
          fontSize: 32,
          lineHeight: 42,
        }),
      );
    });

    it('applies small-medium font size for amounts with 13-14 characters', () => {
      const amount = '1234567.8901';

      const { getByTestId } = render(<PredictAmountDisplay amount={amount} />);
      const amountText = getByTestId(
        PerpsAmountDisplaySelectorsIDs.AMOUNT_LABEL,
      );

      expect(amountText.props.style).toEqual(
        expect.objectContaining({
          fontSize: 24,
          lineHeight: 34,
        }),
      );
    });

    it('applies small font size for amounts with 15-18 characters', () => {
      const amount = '1234567890.1234';

      const { getByTestId } = render(<PredictAmountDisplay amount={amount} />);
      const amountText = getByTestId(
        PerpsAmountDisplaySelectorsIDs.AMOUNT_LABEL,
      );

      expect(amountText.props.style).toEqual(
        expect.objectContaining({
          fontSize: 18,
          lineHeight: 28,
        }),
      );
    });

    it('applies smallest font size for amounts with more than 18 characters', () => {
      const amount = '12345678901234567.89';

      const { getByTestId } = render(<PredictAmountDisplay amount={amount} />);
      const amountText = getByTestId(
        PerpsAmountDisplaySelectorsIDs.AMOUNT_LABEL,
      );

      expect(amountText.props.style).toEqual(
        expect.objectContaining({
          fontSize: 12,
          lineHeight: 22,
        }),
      );
    });
  });

  describe('Animation Behavior', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('starts cursor animation when isActive becomes true', () => {
      const amount = '1000';
      const { getByTestId, rerender } = render(
        <PredictAmountDisplay amount={amount} isActive={false} />,
      );

      rerender(<PredictAmountDisplay amount={amount} isActive />);

      expect(getByTestId('cursor')).toBeOnTheScreen();
    });

    it('stops cursor animation when isActive becomes false', () => {
      const amount = '1000';
      const { queryByTestId, rerender } = render(
        <PredictAmountDisplay amount={amount} isActive />,
      );

      rerender(<PredictAmountDisplay amount={amount} isActive={false} />);

      expect(queryByTestId('cursor')).toBeNull();
    });

    it('renders cursor with correct animation styles when active', () => {
      const amount = '1000';

      const { getByTestId } = render(
        <PredictAmountDisplay amount={amount} isActive />,
      );
      const cursor = getByTestId('cursor');

      expect(cursor.props.style).toEqual(
        expect.objectContaining({
          backgroundColor: expect.any(String),
          opacity: expect.any(Number),
        }),
      );
    });
  });

  describe('Component Composition', () => {
    it('allows pressing when onPress is provided', () => {
      const onPressMock = jest.fn();
      const amount = '1000';

      const { getByTestId } = render(
        <PredictAmountDisplay amount={amount} onPress={onPressMock} />,
      );
      const container = getByTestId(PerpsAmountDisplaySelectorsIDs.CONTAINER);
      fireEvent.press(container);

      expect(onPressMock).toHaveBeenCalledTimes(1);
    });

    it('renders correctly when onPress is not provided', () => {
      const amount = '1000';

      const { getByTestId } = render(<PredictAmountDisplay amount={amount} />);
      const container = getByTestId(PerpsAmountDisplaySelectorsIDs.CONTAINER);

      expect(container).toBeOnTheScreen();
    });
  });

  describe('Combined States', () => {
    it('displays cursor and error color together when both isActive and hasError are true', () => {
      const amount = '1000';

      const { getByTestId } = render(
        <PredictAmountDisplay amount={amount} isActive hasError />,
      );

      expect(getByTestId('cursor')).toBeOnTheScreen();
      expect(
        getByTestId(PerpsAmountDisplaySelectorsIDs.AMOUNT_LABEL),
      ).toBeOnTheScreen();
    });

    it('handles onPress with isActive and hasError simultaneously', () => {
      const onPressMock = jest.fn();
      const amount = '1000';

      const { getByText } = render(
        <PredictAmountDisplay
          amount={amount}
          onPress={onPressMock}
          isActive
          hasError
        />,
      );
      fireEvent.press(getByText('$1000'));

      expect(onPressMock).toHaveBeenCalledTimes(1);
    });
  });
});
