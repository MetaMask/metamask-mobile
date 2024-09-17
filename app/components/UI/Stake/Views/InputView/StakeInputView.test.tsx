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

describe('StakeInputView', () => {
  it('render matches snapshot', () => {
    render(StakeInputView);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  describe('when values are entered in the keypad', () => {
    it('updates ETH and fiat values', () => {
      render(StakeInputView);

      fireEvent.press(screen.getByText('2'));

      expect(screen.getByText('4000 USD')).toBeTruthy();
    });
  });

  describe('currency toggle functionality', () => {
    it('switches between ETH and fiat correctly', () => {
      render(StakeInputView);

      expect(screen.getByText('ETH')).toBeTruthy();
      fireEvent.press(screen.getByText('0 USD'));

      expect(screen.getByText('USD')).toBeTruthy();
    });
  });

  describe('when calculating rewards', () => {
    it('calculates estimated annual rewards based on input', () => {
      render(StakeInputView);

      fireEvent.press(screen.getByText('2'));

      expect(screen.getByText('0.052 ETH')).toBeTruthy();
    });
  });

  describe('quick amount buttons', () => {
    it('handles 25% quick amount button press correctly', () => {
      render(StakeInputView);

      fireEvent.press(screen.getByText('25%'));

      expect(screen.getByText('0.375')).toBeTruthy();
    });
  });

  describe('stake button states', () => {
    it('displays `Enter amount` if input is 0', () => {
      render(StakeInputView);

      expect(screen.getByText('Enter amount')).toBeTruthy();
    });

    it('displays `Review` on stake button if input is valid', () => {
      render(StakeInputView);

      fireEvent.press(screen.getByText('1'));
      expect(screen.getByText('Review')).toBeTruthy();
    });

    it('displays `Not enough ETH` when input exceeds balance', () => {
      render(StakeInputView);

      fireEvent.press(screen.getByText('4'));
      expect(screen.queryAllByText('Not enough ETH')).toHaveLength(2);
    });
  });
});
