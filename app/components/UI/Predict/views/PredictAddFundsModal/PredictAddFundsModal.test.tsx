import React from 'react';
import { render } from '@testing-library/react-native';
import PredictAddFundsModal from './PredictAddFundsModal';

const mockGoBack = jest.fn();
const mockCanGoBack = jest.fn();

type NavigationListener = () => void;
const blurListeners: NavigationListener[] = [];
const focusListeners: NavigationListener[] = [];

const mockAddListener = jest.fn(
  (event: string, listener: NavigationListener) => {
    if (event === 'blur') blurListeners.push(listener);
    if (event === 'focus') focusListeners.push(listener);
    return jest.fn();
  },
);

const mockUseRoute = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
    canGoBack: mockCanGoBack,
    addListener: mockAddListener,
  }),
  useRoute: () => mockUseRoute(),
}));

const mockDeposit = jest.fn();

jest.mock('../../hooks/usePredictDeposit', () => ({
  usePredictDeposit: () => ({
    deposit: mockDeposit,
    isDepositPending: false,
  }),
}));

const mockOnOpenBottomSheet = jest.fn();
const mockPredictAddFundsSheet = jest.fn();

jest.mock('../../components/PredictAddFundsSheet/PredictAddFundsSheet', () => {
  const React = jest.requireActual('react');
  return React.forwardRef(
    (
      props: { onDismiss?: () => void },
      ref: React.Ref<{ onOpenBottomSheet: () => void }>,
    ) => {
      React.useImperativeHandle(ref, () => ({
        onOpenBottomSheet: mockOnOpenBottomSheet,
      }));
      mockPredictAddFundsSheet(props);
      return null;
    },
  );
});

describe('PredictAddFundsModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    blurListeners.length = 0;
    focusListeners.length = 0;
    mockUseRoute.mockReturnValue({ params: {} });
    mockCanGoBack.mockReturnValue(true);
  });

  describe('standard mode (autoDeposit: false)', () => {
    it('renders PredictAddFundsSheet', () => {
      render(<PredictAddFundsModal />);

      expect(mockPredictAddFundsSheet).toHaveBeenCalledTimes(1);
    });

    it('opens the bottom sheet on mount', () => {
      render(<PredictAddFundsModal />);

      expect(mockOnOpenBottomSheet).toHaveBeenCalledTimes(1);
    });

    it('does not call deposit on mount', () => {
      render(<PredictAddFundsModal />);

      expect(mockDeposit).not.toHaveBeenCalled();
    });

    it('calls goBack via onDismiss when canGoBack is true', () => {
      render(<PredictAddFundsModal />);

      const { onDismiss } = mockPredictAddFundsSheet.mock.calls[0][0];
      onDismiss();

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('does not call goBack via onDismiss when canGoBack is false', () => {
      mockCanGoBack.mockReturnValue(false);
      render(<PredictAddFundsModal />);

      const { onDismiss } = mockPredictAddFundsSheet.mock.calls[0][0];
      onDismiss();

      expect(mockGoBack).not.toHaveBeenCalled();
    });

    it('does not register blur/focus navigation listeners', () => {
      render(<PredictAddFundsModal />);

      expect(blurListeners).toHaveLength(0);
      expect(focusListeners).toHaveLength(0);
    });
  });

  describe('autoDeposit mode (autoDeposit: true)', () => {
    beforeEach(() => {
      mockUseRoute.mockReturnValue({ params: { autoDeposit: true } });
    });

    it('renders null — no sheet UI shown', () => {
      const { toJSON } = render(<PredictAddFundsModal />);

      expect(toJSON()).toBeNull();
      expect(mockPredictAddFundsSheet).not.toHaveBeenCalled();
    });

    it('calls deposit() on mount', () => {
      render(<PredictAddFundsModal />);

      expect(mockDeposit).toHaveBeenCalledTimes(1);
    });

    it('does not open the sheet on mount', () => {
      render(<PredictAddFundsModal />);

      expect(mockOnOpenBottomSheet).not.toHaveBeenCalled();
    });

    it('registers blur and focus navigation listeners', () => {
      render(<PredictAddFundsModal />);

      expect(blurListeners).toHaveLength(1);
      expect(focusListeners).toHaveLength(1);
    });

    it('does not call goBack on initial focus (before blur)', () => {
      render(<PredictAddFundsModal />);

      focusListeners[0]();

      expect(mockGoBack).not.toHaveBeenCalled();
    });

    it('calls goBack when screen refocuses after blur (MMPay closed)', () => {
      render(<PredictAddFundsModal />);

      blurListeners[0]();
      focusListeners[0]();

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('does not call goBack if canGoBack returns false', () => {
      mockCanGoBack.mockReturnValue(false);
      render(<PredictAddFundsModal />);

      blurListeners[0]();
      focusListeners[0]();

      expect(mockGoBack).not.toHaveBeenCalled();
    });

    it('only calls goBack once even if focus fires multiple times after blur', () => {
      render(<PredictAddFundsModal />);

      blurListeners[0]();
      focusListeners[0]();
      focusListeners[0]();

      expect(mockGoBack).toHaveBeenCalledTimes(2);
    });
  });
});
