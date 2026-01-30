import React, { useRef, useEffect } from 'react';
import {
  render,
  fireEvent,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import PredictAddFundsSheet, {
  PredictAddFundsSheetRef,
} from './PredictAddFundsSheet';
import { usePredictDeposit } from '../../hooks/usePredictDeposit';
import { usePredictActionGuard } from '../../hooks/usePredictActionGuard';

jest.mock('../../hooks/usePredictDeposit');
jest.mock('../../hooks/usePredictActionGuard');

jest.mock('../../../../hooks/useNavigation', () => ({
  withNavigation: <T,>(component: T): T => component,
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'predict.add_funds_sheet.title': 'Add funds',
      'predict.add_funds_sheet.description':
        "You'll need to add funds to your Predictions account to get started. You can add any token and make your first prediction in seconds.",
    };
    return translations[key] || key;
  }),
}));

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

const TestComponent = ({
  onDismiss,
  shouldOpen = false,
}: {
  onDismiss?: () => void;
  shouldOpen?: boolean;
}) => {
  const ref = useRef<PredictAddFundsSheetRef>(null);

  useEffect(() => {
    if (shouldOpen) {
      ref.current?.onOpenBottomSheet();
    }
  }, [shouldOpen]);

  return (
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 375, height: 812 },
        insets: { top: 44, left: 0, right: 0, bottom: 34 },
      }}
    >
      <PredictAddFundsSheet ref={ref} onDismiss={onDismiss} />
    </SafeAreaProvider>
  );
};

describe('PredictAddFundsSheet', () => {
  const mockOnDismiss = jest.fn();
  const mockDeposit = jest.fn();
  const mockExecuteGuardedAction = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (usePredictDeposit as jest.Mock).mockReturnValue({
      deposit: mockDeposit,
    });
    (usePredictActionGuard as jest.Mock).mockReturnValue({
      executeGuardedAction: mockExecuteGuardedAction,
    });
  });

  describe('visibility', () => {
    it('hides bottom sheet on initial render', () => {
      render(<TestComponent onDismiss={mockOnDismiss} />);

      expect(screen.queryByText('Add funds')).toBeNull();
    });

    it('displays bottom sheet when opened via ref', async () => {
      render(<TestComponent onDismiss={mockOnDismiss} shouldOpen />);

      await waitFor(() => {
        expect(screen.getAllByText('Add funds').length).toBeGreaterThan(0);
      });
      expect(
        screen.getByText(
          /You'll need to add funds to your Predictions account/,
        ),
      ).toBeOnTheScreen();
    });
  });

  describe('content', () => {
    it('displays title and description when opened', async () => {
      render(<TestComponent onDismiss={mockOnDismiss} shouldOpen />);

      await waitFor(() => {
        expect(screen.getAllByText('Add funds').length).toBe(2);
      });
      expect(
        screen.getByText(
          /You'll need to add funds to your Predictions account to get started/,
        ),
      ).toBeOnTheScreen();
    });
  });

  describe('add funds interaction', () => {
    it('calls executeGuardedAction with deposit function when add funds button is pressed', async () => {
      render(<TestComponent onDismiss={mockOnDismiss} shouldOpen />);

      const addFundsButton = await waitFor(() =>
        screen.getByRole('button', { name: /add funds/i }),
      );
      fireEvent.press(addFundsButton);

      expect(mockExecuteGuardedAction).toHaveBeenCalledTimes(1);
      expect(mockExecuteGuardedAction).toHaveBeenCalledWith(
        expect.any(Function),
        { attemptedAction: 'deposit' },
      );
    });

    it('calls deposit when executeGuardedAction executes callback', async () => {
      mockExecuteGuardedAction.mockImplementation((fn: () => void) => fn());

      render(<TestComponent onDismiss={mockOnDismiss} shouldOpen />);

      const addFundsButton = await waitFor(() =>
        screen.getByRole('button', { name: /add funds/i }),
      );
      fireEvent.press(addFundsButton);

      expect(mockDeposit).toHaveBeenCalledTimes(1);
    });
  });

  describe('optional callbacks', () => {
    it('renders without crashing when onDismiss is not provided', () => {
      expect(() => render(<TestComponent shouldOpen />)).not.toThrow();
    });
  });
});
