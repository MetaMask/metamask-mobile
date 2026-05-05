import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import OndoAfterHoursSheet from './OndoAfterHoursSheet';

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const ReactActual = jest.requireActual('react');
  const { View, Pressable } = jest.requireActual('react-native');
  return {
    ...actual,
    BottomSheet: ({
      children,
      onClose,
    }: {
      children?: React.ReactNode;
      onClose?: () => void;
    }) =>
      ReactActual.createElement(
        View,
        { testID: 'bottom-sheet' },
        children,
        ReactActual.createElement(Pressable, {
          testID: 'sheet-backdrop-close',
          onPress: onClose,
        }),
      ),
  };
});

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({ style: (...args: unknown[]) => args }),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock('../../utils/formatUtils', () => ({
  formatTimeRemaining: jest.fn(() => '2h 30m'),
}));

describe('OndoAfterHoursSheet', () => {
  const mockOnClose = jest.fn();
  const mockOnConfirm = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders title and description', () => {
    const { getByTestId } = render(
      <OndoAfterHoursSheet onClose={mockOnClose} nextOpenAt={null} />,
    );
    expect(getByTestId('ondo-after-hours-sheet-title')).toBeDefined();
    expect(getByTestId('ondo-after-hours-sheet-description')).toBeDefined();
  });

  it('calls onClose when the close button is pressed', () => {
    const { getByTestId } = render(
      <OndoAfterHoursSheet onClose={mockOnClose} nextOpenAt={null} />,
    );
    fireEvent.press(getByTestId('ondo-after-hours-sheet-close'));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onConfirm when the got-it button is pressed and onConfirm is provided', () => {
    const { getByTestId } = render(
      <OndoAfterHoursSheet
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        nextOpenAt={null}
      />,
    );
    fireEvent.press(getByTestId('ondo-after-hours-sheet-got-it'));
    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('falls back to onClose when onConfirm is not provided and got-it is pressed', () => {
    const { getByTestId } = render(
      <OndoAfterHoursSheet onClose={mockOnClose} nextOpenAt={null} />,
    );
    fireEvent.press(getByTestId('ondo-after-hours-sheet-got-it'));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('shows countdown pill when nextOpenAt is provided', () => {
    const nextOpenAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const { getByText } = render(
      <OndoAfterHoursSheet onClose={mockOnClose} nextOpenAt={nextOpenAt} />,
    );
    expect(getByText('2h 30m')).toBeDefined();
  });

  it('does not show countdown pill when nextOpenAt is null', () => {
    const { queryByText } = render(
      <OndoAfterHoursSheet onClose={mockOnClose} nextOpenAt={null} />,
    );
    expect(queryByText('2h 30m')).toBeNull();
  });
});
