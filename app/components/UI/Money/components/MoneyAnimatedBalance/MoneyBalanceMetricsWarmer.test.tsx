import React from 'react';
import { render } from '@testing-library/react-native';
import MoneyBalanceMetricsWarmer from './MoneyBalanceMetricsWarmer';
import MoneyAnimatedBalance from './MoneyAnimatedBalance';

const mockNumberFlow = jest.fn();
jest.mock('number-flow-react-native', () => ({
  NumberFlow: (props: Record<string, unknown>) => {
    mockNumberFlow(props);
    return null;
  },
}));

describe('MoneyBalanceMetricsWarmer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('measures with the same font configuration as the real balance', () => {
    render(<MoneyBalanceMetricsWarmer />);
    const warmerProps = mockNumberFlow.mock.calls[0][0];

    mockNumberFlow.mockClear();
    render(<MoneyAnimatedBalance amount={1234.56} animated />);
    const balanceProps = mockNumberFlow.mock.calls[0][0];

    // A drift here would measure into a different cache entry, leaving the
    // real balance unmeasured and losing its first roll.
    expect(warmerProps.style).toEqual(balanceProps.style);
    expect(warmerProps.format).toEqual(balanceProps.format);
    expect(warmerProps.locales).toEqual(balanceProps.locales);
  });

  it('never animates, since it is offscreen', () => {
    render(<MoneyBalanceMetricsWarmer />);

    expect(mockNumberFlow).toHaveBeenCalledWith(
      expect.objectContaining({ animated: false }),
    );
  });

  it('is hidden from assistive technology', () => {
    const { toJSON } = render(<MoneyBalanceMetricsWarmer />);

    expect(JSON.stringify(toJSON())).toContain('no-hide-descendants');
  });
});
