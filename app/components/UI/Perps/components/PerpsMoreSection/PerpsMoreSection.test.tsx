import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { IconName } from '@metamask/design-system-react-native';
import PerpsMoreSection, { type PerpsMoreItem } from './PerpsMoreSection';
import { PerpsMoreSectionTestIds } from './PerpsMoreSection.testIds';

describe('PerpsMoreSection', () => {
  const mockOnPressSupport = jest.fn();
  const mockOnPressLearn = jest.fn();

  const items: PerpsMoreItem[] = [
    {
      label: 'Contact support',
      startIconName: IconName.Sms,
      onPress: mockOnPressSupport,
      testID: 'perps-more-support-button',
    },
    {
      label: 'Learn the basics of perps',
      startIconName: IconName.Book,
      onPress: mockOnPressLearn,
      testID: 'perps-more-learn-button',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the More section title and items', () => {
    render(<PerpsMoreSection items={items} />);

    expect(screen.getByText('More')).toBeOnTheScreen();
    expect(screen.getByText('Contact support')).toBeOnTheScreen();
    expect(screen.getByText('Learn the basics of perps')).toBeOnTheScreen();
    expect(
      screen.getByTestId(PerpsMoreSectionTestIds.SECTION),
    ).toBeOnTheScreen();
  });

  it('calls onPress when an item is pressed', () => {
    render(<PerpsMoreSection items={items} />);

    fireEvent.press(screen.getByTestId('perps-more-support-button'));
    fireEvent.press(screen.getByTestId('perps-more-learn-button'));

    expect(mockOnPressSupport).toHaveBeenCalledTimes(1);
    expect(mockOnPressLearn).toHaveBeenCalledTimes(1);
  });

  it('renders end icon when provided', () => {
    const itemsWithEndIcon: PerpsMoreItem[] = [
      {
        label: 'Contact support',
        startIconName: IconName.Sms,
        endIconName: IconName.Export,
        onPress: mockOnPressSupport,
        testID: 'perps-more-support-button',
      },
    ];

    render(<PerpsMoreSection items={itemsWithEndIcon} />);

    expect(screen.getByText('Contact support')).toBeOnTheScreen();
  });
});
