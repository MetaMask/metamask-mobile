import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import MusdCalculatorTab from './MusdCalculatorTab';

const mockGoToSwaps = jest.fn();

jest.mock('react-redux', () => ({
  useSelector: jest.fn(() => 'usd'),
  useDispatch: jest.fn(() => jest.fn()),
}));

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

jest.mock('../../../../../../core/DeeplinkManager', () => ({
  handleDeeplink: jest.fn(),
}));

jest.mock('../../../../Bridge/hooks/useSwapBridgeNavigation', () => ({
  useSwapBridgeNavigation: () => ({ goToSwaps: mockGoToSwaps }),
  SwapBridgeNavigationLocation: { Rewards: 'Rewards' },
}));

jest.mock('../../../../../../util/theme', () => {
  const { mockTheme } = jest.requireActual('../../../../../../util/theme');
  return {
    useTheme: () => mockTheme,
  };
});

describe('MusdCalculatorTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all calculator UI elements', () => {
    const { getByText } = render(<MusdCalculatorTab />);

    expect(getByText('rewards.musd.title')).toBeTruthy();
    expect(getByText('rewards.musd.description')).toBeTruthy();
    expect(getByText('rewards.musd.amount_label')).toBeTruthy();
    expect(getByText('rewards.musd.estimated_bonus')).toBeTruthy();
    expect(getByText('rewards.musd.initial_amount')).toBeTruthy();
    expect(getByText('rewards.musd.daily_bonus')).toBeTruthy();
    expect(getByText('rewards.musd.annualized_bonus')).toBeTruthy();
    expect(getByText('rewards.musd.disclaimer_brief')).toBeTruthy();
    expect(getByText('rewards.musd.buy_button')).toBeTruthy();
    expect(getByText('rewards.musd.swap_button')).toBeTruthy();
  });

  it('calls handleDeeplink with buy URL when Buy button is pressed', () => {
    const { handleDeeplink } = jest.requireMock(
      '../../../../../../core/DeeplinkManager',
    );

    const { getByText } = render(<MusdCalculatorTab />);
    fireEvent.press(getByText('rewards.musd.buy_button'));

    expect(handleDeeplink).toHaveBeenCalledWith({
      uri: expect.stringContaining('link.metamask.io/buy'),
    });
  });

  it('navigates to swap screen when Swap button is pressed', () => {
    const { getByText } = render(<MusdCalculatorTab />);
    fireEvent.press(getByText('rewards.musd.swap_button'));

    expect(mockGoToSwaps).toHaveBeenCalled();
  });

  it('updates input value when amount changes', () => {
    const { getByTestId } = render(<MusdCalculatorTab />);

    const input = getByTestId('musd-amount-input');
    fireEvent.changeText(input, '5000');

    expect(input.props.value).toBe('5000');
  });

  it('sanitizes non-numeric input', () => {
    const { getByTestId } = render(<MusdCalculatorTab />);

    const input = getByTestId('musd-amount-input');
    fireEvent.changeText(input, 'abc123def');

    expect(input.props.value).toBe('123');
  });

  it('allows decimal input', () => {
    const { getByTestId } = render(<MusdCalculatorTab />);

    const input = getByTestId('musd-amount-input');
    fireEvent.changeText(input, '1000.50');

    expect(input.props.value).toBe('1000.50');
  });

  it('rejects multiple decimal points', () => {
    const { getByTestId } = render(<MusdCalculatorTab />);

    const input = getByTestId('musd-amount-input');
    fireEvent.changeText(input, '1000.50');
    fireEvent.changeText(input, '1000.50.25');

    expect(input.props.value).toBe('1000.50');
  });

  it('calculates correct bonus values for $5000 input', async () => {
    const { getByTestId, getByText } = render(<MusdCalculatorTab />);

    const input = getByTestId('musd-amount-input');
    fireEvent.changeText(input, '5000');

    // Initial amount: $5,000.00
    // Daily bonus: $5000 * 0.03 / 365 = $0.41
    // Annualized bonus: $5000 * 0.03 = $150.00
    await waitFor(() => {
      expect(getByText('$5,000')).toBeOnTheScreen();
      expect(getByText('$0.41')).toBeOnTheScreen();
      expect(getByText('$150')).toBeOnTheScreen();
    });
  });
});
