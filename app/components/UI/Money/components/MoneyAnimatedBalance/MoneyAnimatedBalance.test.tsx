import React from 'react';
import { render } from '@testing-library/react-native';
import MoneyAnimatedBalance, {
  MoneyBalanceMetricsWarmer,
} from './MoneyAnimatedBalance';

// NumberFlow measures glyphs natively and keys that measurement cache by font
// configuration, neither of which a rendered tree exposes. The warmer only pays
// off when it lands on the same cache entry as the balance, so that contract is
// asserted here rather than in MoneyHomeView.view.test.tsx.
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

  it('renders the amount as whole-cent US dollars, honouring the animation decision', () => {
    render(<MoneyAnimatedBalance amount={9999.99} animated={false} />);

    expect(mockNumberFlow).toHaveBeenCalledWith(
      expect.objectContaining({
        value: 9999.99,
        animated: false,
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

  it('warms metrics into the same cache entry the balance measures into', () => {
    render(<MoneyBalanceMetricsWarmer />);
    const warmer = mockNumberFlow.mock.calls[0][0];

    mockNumberFlow.mockClear();
    render(<MoneyAnimatedBalance amount={1234.56} animated />);
    const balance = mockNumberFlow.mock.calls[0][0];

    expect(warmer.style).toEqual(balance.style);
    expect(warmer.format).toEqual(balance.format);
    expect(warmer.locales).toEqual(balance.locales);
    expect(warmer.animated).toBe(false);
  });
});
