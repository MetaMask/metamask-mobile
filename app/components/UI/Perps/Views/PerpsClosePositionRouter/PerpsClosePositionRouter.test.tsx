import React from 'react';
import { render } from '@testing-library/react-native';
import PerpsClosePositionRouter from './PerpsClosePositionRouter';
import { usePerpsScreenVsBottomSheetAbTest } from '../../hooks';

jest.mock('../../hooks', () => ({
  usePerpsScreenVsBottomSheetAbTest: jest.fn(),
}));

jest.mock('../PerpsClosePositionView', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () => <View testID="mock-close-position-view" />,
  };
});

jest.mock('../PerpsClosePositionBottomSheet', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () => <View testID="mock-close-position-bottom-sheet" />,
  };
});

const mockUseAbTest = jest.mocked(usePerpsScreenVsBottomSheetAbTest);

describe('PerpsClosePositionRouter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the full-page close flow for control', () => {
    mockUseAbTest.mockReturnValue({ useBottomSheet: false });

    const { getByTestId, queryByTestId } = render(<PerpsClosePositionRouter />);

    expect(getByTestId('mock-close-position-view')).toBeOnTheScreen();
    expect(queryByTestId('mock-close-position-bottom-sheet')).toBeNull();
  });

  it('renders the bottom sheet for treatment', () => {
    mockUseAbTest.mockReturnValue({ useBottomSheet: true });

    const { getByTestId, queryByTestId } = render(<PerpsClosePositionRouter />);

    expect(getByTestId('mock-close-position-bottom-sheet')).toBeOnTheScreen();
    expect(queryByTestId('mock-close-position-view')).toBeNull();
  });

  it('resolves the assignment with exposure tracking left enabled', () => {
    mockUseAbTest.mockReturnValue({ useBottomSheet: false });

    render(<PerpsClosePositionRouter />);

    expect(mockUseAbTest).toHaveBeenCalledWith();
  });
});
