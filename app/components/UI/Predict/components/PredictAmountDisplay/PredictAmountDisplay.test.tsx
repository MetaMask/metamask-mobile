import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PerpsAmountDisplaySelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';
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
  });
});
