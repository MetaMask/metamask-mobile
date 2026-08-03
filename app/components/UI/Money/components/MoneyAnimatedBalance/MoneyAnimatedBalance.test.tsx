import React from 'react';
import { render } from '@testing-library/react-native';
import MoneyAnimatedBalance from './MoneyAnimatedBalance';

const mockNumberFlow = jest.fn();
jest.mock('number-flow-react-native', () => ({
  NumberFlow: (props: Record<string, unknown>) => {
    mockNumberFlow(props);
    return null;
  },
}));

describe('MoneyAnimatedBalance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exposes the testID on a wrapper, since NumberFlow does not forward it', () => {
    const { getByTestId } = render(
      <MoneyAnimatedBalance amount={1234.56} animated testID="balance" />,
    );

    expect(getByTestId('balance')).toBeOnTheScreen();
  });

  it('renders the given amount', () => {
    render(<MoneyAnimatedBalance amount={9999.99} animated testID="balance" />);

    expect(mockNumberFlow).toHaveBeenCalledWith(
      expect.objectContaining({ value: 9999.99 }),
    );
  });

  it('passes the animation decision through', () => {
    render(
      <MoneyAnimatedBalance
        amount={1234.56}
        animated={false}
        testID="balance"
      />,
    );

    expect(mockNumberFlow).toHaveBeenCalledWith(
      expect.objectContaining({ animated: false }),
    );
  });

  it('formats as whole-cent US dollars', () => {
    render(<MoneyAnimatedBalance amount={1234.56} animated testID="balance" />);

    expect(mockNumberFlow).toHaveBeenCalledWith(
      expect.objectContaining({
        locales: 'en-US',
        format: {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        },
      }),
    );
  });

  it('resolves design system typography into a concrete text style', () => {
    render(<MoneyAnimatedBalance amount={1234.56} animated testID="balance" />);

    const { style } = mockNumberFlow.mock.calls[0][0];
    expect(style.fontSize).toEqual(expect.any(Number));
    expect(style.fontFamily).toEqual(expect.any(String));
  });
});
