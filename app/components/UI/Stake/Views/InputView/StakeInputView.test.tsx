import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import StakeInputView from './StakeInputView';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import Routes from '../../../../../constants/navigation/Routes';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { BN } from 'ethereumjs-util';

function render(Component: React.ComponentType) {
  return renderScreen(
    Component,
    {
      name: Routes.STAKE.STAKE,
    },
    {
      state: {
        engine: {
          backgroundState,
        },
      },
    },
  );
}

const mockSetOptions = jest.fn();
const mockNavigate = jest.fn();
const mockReset = jest.fn();
const mockPop = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
      setOptions: mockSetOptions.mockImplementation(
        actualReactNavigation.useNavigation().setOptions,
      ),
      reset: mockReset,
      dangerouslyGetParent: () => ({
        pop: mockPop,
      }),
    }),
  };
});

// Mock necessary modules and hooks
jest.mock('../../../../../selectors/currencyRateController.ts', () => ({
  selectConversionRate: jest.fn(() => 2000),
  selectCurrentCurrency: jest.fn(() => 'USD'),
}));

const mockBalanceBN = new BN('1500000000000000000');
jest.mock('../../hooks/useBalance', () => ({
  __esModule: true,
  default: () => ({
    balance: '1.5',
    balanceBN: mockBalanceBN,
    balanceFiatNumber: '3000',
  }),
}));

describe('StakeInputView Tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render correctly', () => {
    render(StakeInputView);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('should update ETH and fiat when values are entered in the keypad', () => {
    render(StakeInputView);

    // Simulate entering a value in the keypad
    fireEvent.press(screen.getByText('2'));
    // Check fiat conversion
    expect(screen.getByText('4000 USD')).toBeTruthy();
  });

  it('should switch between ETH and fiat correctly', () => {
    render(StakeInputView);
    expect(screen.getByText('ETH')).toBeTruthy();

    // Simulate currency switch by pressing the button labeled '0 USD'
    fireEvent.press(screen.getByText('0 USD'));

    // After switching, it should display fiat
    expect(screen.getByText('USD')).toBeTruthy();
  });

  it('should calculate estimated annual rewards based on input', () => {
    render(StakeInputView);

    fireEvent.press(screen.getByText('2'));

    // Check if rewards calculation is triggered
    expect(screen.getByText('0.052 ETH')).toBeTruthy();
  });

  it('should handle quick amount button press correctly', () => {
    render(StakeInputView);

    const quickAmountButton = screen.getByText('25%');
    fireEvent.press(quickAmountButton);

    // Assuming 25% of balance is selected and displayed
    expect(screen.getByText('0.375')).toBeTruthy();
  });

  it('should display `Enter amount` on stake button if input is 0', () => {
    render(StakeInputView);
    expect(screen.getByText('Enter amount')).toBeTruthy();
  });

  it('should display Review on the stake button if input is valid', () => {
    render(StakeInputView);
    fireEvent.press(screen.getByText('1'));
    expect(screen.getByText('Review')).toBeTruthy();
  });

  it('should display Not enough ETH on the stake button and replace balance text if input is more than balance', () => {
    render(StakeInputView);
    fireEvent.press(screen.getByText('4'));
    expect(screen.queryAllByText('Not enough ETH')).toHaveLength(2);
  });
});
