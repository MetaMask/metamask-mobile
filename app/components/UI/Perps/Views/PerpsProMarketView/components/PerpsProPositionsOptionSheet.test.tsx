import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from '@metamask/design-system-react-native';
import PerpsProPositionsOptionSheet from './PerpsProPositionsOptionSheet';
import { playSelection } from '../../../../../../util/haptics';

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'perps.sort.apply': 'Apply',
      'perps.sort.clear': 'Clear',
    };
    return translations[key] || key;
  }),
}));

jest.mock('../../../../../../util/haptics');

describe('PerpsProPositionsOptionSheet', () => {
  const mockOnClose = jest.fn();
  const mockOnApply = jest.fn();
  const mockOnOpen = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when not visible', () => {
    const { toJSON } = render(
      <PerpsProPositionsOptionSheet
        isVisible={false}
        title="Options"
        onClose={mockOnClose}
        onApply={mockOnApply}
      >
        <Text>Option</Text>
      </PerpsProPositionsOptionSheet>,
    );

    expect(toJSON()).toBeNull();
  });

  it('renders children and applies on save', () => {
    render(
      <PerpsProPositionsOptionSheet
        isVisible
        title="Options"
        onClose={mockOnClose}
        onApply={mockOnApply}
        onOpen={mockOnOpen}
        testID="option-sheet"
      >
        <Text>Option</Text>
      </PerpsProPositionsOptionSheet>,
    );

    expect(screen.getByText('Options')).toBeOnTheScreen();
    expect(screen.getByText('Option')).toBeOnTheScreen();
    expect(mockOnOpen).toHaveBeenCalled();

    fireEvent.press(screen.getByTestId('option-sheet-apply'));

    expect(mockOnApply).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
    expect(playSelection).toHaveBeenCalledTimes(1);
  });

  it('plays selection when Clear is pressed', () => {
    const onClear = jest.fn();
    render(
      <PerpsProPositionsOptionSheet
        isVisible
        title="Options"
        onClose={mockOnClose}
        onApply={mockOnApply}
        onClear={onClear}
        testID="option-sheet"
      >
        <Text>Option</Text>
      </PerpsProPositionsOptionSheet>,
    );

    fireEvent.press(screen.getByTestId('option-sheet-clear'));

    expect(onClear).toHaveBeenCalledTimes(1);
    expect(mockOnClose).toHaveBeenCalled();
    expect(playSelection).toHaveBeenCalledTimes(1);
  });
});
