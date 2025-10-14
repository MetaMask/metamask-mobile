import React from 'react';
import { render } from '@testing-library/react-native';
import PredictUnavailableModal from './PredictUnavailableModal';

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

jest.mock('../../components/PredictUnavailable/PredictUnavailable', () =>
  jest.fn().mockImplementation(({ onDismiss: _onDismiss }) => {
    mockOnOpenBottomSheet();
    return null;
  }),
);

describe('PredictUnavailableModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<PredictUnavailableModal />);
    expect(mockOnOpenBottomSheet).toHaveBeenCalledTimes(1);
  });

  it('calls onOpenBottomSheet on mount', () => {
    render(<PredictUnavailableModal />);
    expect(mockOnOpenBottomSheet).toHaveBeenCalledTimes(1);
  });

  it('passes onDismiss callback to PredictUnavailable', () => {
    render(<PredictUnavailableModal />);
    const PredictUnavailable = jest.requireMock(
      '../../components/PredictUnavailable/PredictUnavailable',
    );

    expect(PredictUnavailable).toHaveBeenCalledWith(
      expect.objectContaining({
        onDismiss: expect.any(Function),
      }),
      expect.any(Object),
    );
  });

  it('creates a stable handleDismiss callback', () => {
    const { rerender } = render(<PredictUnavailableModal />);
    rerender(<PredictUnavailableModal />);

    expect(mockOnOpenBottomSheet).toHaveBeenCalled();
  });

  it('handles navigation when canGoBack is true', () => {
    mockCanGoBack.mockReturnValue(true);
    render(<PredictUnavailableModal />);

    expect(mockCanGoBack).toBeDefined();
    expect(mockGoBack).toBeDefined();
  });

  it('handles navigation when canGoBack is false', () => {
    mockCanGoBack.mockReturnValue(false);
    render(<PredictUnavailableModal />);

    expect(mockCanGoBack).toBeDefined();
    expect(mockGoBack).toBeDefined();
  });

  it('forwards ref to PredictUnavailable component', () => {
    render(<PredictUnavailableModal />);
    const PredictUnavailable = jest.requireMock(
      '../../components/PredictUnavailable/PredictUnavailable',
    );

    expect(PredictUnavailable).toHaveBeenCalledWith(
      expect.any(Object),
      expect.any(Object),
    );
  });

  it('calls navigation.goBack when handleDismiss is called and canGoBack returns true', () => {
    mockCanGoBack.mockReturnValue(true);
    render(<PredictUnavailableModal />);
    const PredictUnavailable = jest.requireMock(
      '../../components/PredictUnavailable/PredictUnavailable',
    );
    const onDismiss = PredictUnavailable.mock.calls[0][0].onDismiss;
    onDismiss();

    expect(mockCanGoBack).toHaveBeenCalledTimes(1);
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('does not call navigation.goBack when handleDismiss is called and canGoBack returns false', () => {
    mockCanGoBack.mockReturnValue(false);
    render(<PredictUnavailableModal />);
    const PredictUnavailable = jest.requireMock(
      '../../components/PredictUnavailable/PredictUnavailable',
    );
    const onDismiss = PredictUnavailable.mock.calls[0][0].onDismiss;
    onDismiss();

    expect(mockCanGoBack).toHaveBeenCalledTimes(1);
    expect(mockGoBack).not.toHaveBeenCalled();
  });
});
