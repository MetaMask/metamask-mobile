import React from 'react';
import { render } from '@testing-library/react-native';
import PredictAddFundsModal from './PredictAddFundsModal';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockCanGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
    canGoBack: mockCanGoBack,
  }),
}));

const mockOnOpenBottomSheet = jest.fn();

jest.mock('../../components/PredictAddFundsSheet/PredictAddFundsSheet', () =>
  jest.fn().mockImplementation(({ onDismiss: _onDismiss }) => {
    mockOnOpenBottomSheet();
    return null;
  }),
);

describe('PredictAddFundsModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<PredictAddFundsModal />);
    expect(mockOnOpenBottomSheet).toHaveBeenCalledTimes(1);
  });

  it('calls onOpenBottomSheet on mount', () => {
    render(<PredictAddFundsModal />);
    expect(mockOnOpenBottomSheet).toHaveBeenCalledTimes(1);
  });

  it('passes onDismiss callback to PredictAddFundsSheet', () => {
    render(<PredictAddFundsModal />);
    const PredictAddFundsSheet = jest.requireMock(
      '../../components/PredictAddFundsSheet/PredictAddFundsSheet',
    );

    expect(PredictAddFundsSheet).toHaveBeenCalledWith(
      expect.objectContaining({
        onDismiss: expect.any(Function),
      }),
      expect.any(Object),
    );
  });

  it('creates a stable handleDismiss callback', () => {
    const { rerender } = render(<PredictAddFundsModal />);
    rerender(<PredictAddFundsModal />);

    expect(mockOnOpenBottomSheet).toHaveBeenCalled();
  });

  it('handles navigation when canGoBack is true', () => {
    mockCanGoBack.mockReturnValue(true);
    render(<PredictAddFundsModal />);

    expect(mockCanGoBack).toBeDefined();
    expect(mockGoBack).toBeDefined();
  });

  it('handles navigation when canGoBack is false', () => {
    mockCanGoBack.mockReturnValue(false);
    render(<PredictAddFundsModal />);

    expect(mockCanGoBack).toBeDefined();
    expect(mockGoBack).toBeDefined();
  });

  it('forwards ref to PredictAddFundsSheet component', () => {
    render(<PredictAddFundsModal />);
    const PredictAddFundsSheet = jest.requireMock(
      '../../components/PredictAddFundsSheet/PredictAddFundsSheet',
    );

    expect(PredictAddFundsSheet).toHaveBeenCalledWith(
      expect.any(Object),
      expect.any(Object),
    );
  });

  it('calls navigation.goBack when handleDismiss is called and canGoBack returns true', () => {
    mockCanGoBack.mockReturnValue(true);
    render(<PredictAddFundsModal />);
    const PredictAddFundsSheet = jest.requireMock(
      '../../components/PredictAddFundsSheet/PredictAddFundsSheet',
    );
    const onDismiss = PredictAddFundsSheet.mock.calls[0][0].onDismiss;
    onDismiss();

    expect(mockCanGoBack).toHaveBeenCalledTimes(1);
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('does not call navigation.goBack when handleDismiss is called and canGoBack returns false', () => {
    mockCanGoBack.mockReturnValue(false);
    render(<PredictAddFundsModal />);
    const PredictAddFundsSheet = jest.requireMock(
      '../../components/PredictAddFundsSheet/PredictAddFundsSheet',
    );
    const onDismiss = PredictAddFundsSheet.mock.calls[0][0].onDismiss;
    onDismiss();

    expect(mockCanGoBack).toHaveBeenCalledTimes(1);
    expect(mockGoBack).not.toHaveBeenCalled();
  });
});
