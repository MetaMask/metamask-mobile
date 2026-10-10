import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import PerpsCrossMarginWarningBottomSheet from './PerpsCrossMarginWarningBottomSheet';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

describe('PerpsCrossMarginWarningBottomSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders cross margin warning title', () => {
      render(<PerpsCrossMarginWarningBottomSheet />);

      expect(screen.getByText('Cross margin not supported')).toBeTruthy();
    });

    it('renders isolated margin requirement message', () => {
      render(<PerpsCrossMarginWarningBottomSheet />);

      expect(
        screen.getByText(
          'MetaMask Perps only support trading with isolated margin. You need to first close your cross margin position before you can trade on MetaMask.',
        ),
      ).toBeTruthy();
    });

    it('renders dismiss button with correct label', () => {
      render(<PerpsCrossMarginWarningBottomSheet />);

      expect(screen.getByText('Got it')).toBeTruthy();
    });
  });

  describe('Navigation Handling', () => {
    it('navigates back when dismiss button is pressed', () => {
      render(<PerpsCrossMarginWarningBottomSheet />);

      fireEvent.press(screen.getByText('Got it'));

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('calls onClose callback when provided and dismiss pressed', () => {
      const mockOnClose = jest.fn();

      render(<PerpsCrossMarginWarningBottomSheet onClose={mockOnClose} />);

      fireEvent.press(screen.getByText('Got it'));

      expect(mockOnClose).toHaveBeenCalledTimes(1);
      expect(mockGoBack).not.toHaveBeenCalled();
    });

    it('calls onClose when header close button is pressed', () => {
      const mockOnClose = jest.fn();

      render(<PerpsCrossMarginWarningBottomSheet onClose={mockOnClose} />);

      fireEvent.press(screen.getByTestId('header-close-button'));

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('navigates back when header close pressed without onClose prop', () => {
      render(<PerpsCrossMarginWarningBottomSheet />);

      fireEvent.press(screen.getByTestId('header-close-button'));

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
  });
});
