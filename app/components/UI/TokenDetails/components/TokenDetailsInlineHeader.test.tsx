import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TokenDetailsInlineHeader } from './TokenDetailsInlineHeader';
import { AMBIENT_NEGATIVE_COLOR } from './abTestConfig';

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const { View } = jest.requireActual('react-native');
  return {
    ...actual,
    ButtonIcon: (props: Record<string, unknown>) => (
      <View {...props} testID={props.testID as string} />
    ),
  };
});

describe('TokenDetailsInlineHeader', () => {
  const mockOnBackPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders back button', () => {
    const { getByTestId } = render(
      <TokenDetailsInlineHeader onBackPress={mockOnBackPress} />,
    );

    expect(getByTestId('back-arrow-button')).toBeOnTheScreen();
  });

  it('calls onBackPress when back button is pressed', () => {
    const { getByTestId } = render(
      <TokenDetailsInlineHeader onBackPress={mockOnBackPress} />,
    );

    fireEvent.press(getByTestId('back-arrow-button'));

    expect(mockOnBackPress).toHaveBeenCalledTimes(1);
  });

  it('passes iconProps with color when iconColorClass is provided', () => {
    const { getByTestId } = render(
      <TokenDetailsInlineHeader
        onBackPress={mockOnBackPress}
        iconColorClass={`text-[${AMBIENT_NEGATIVE_COLOR}]`}
      />,
    );

    const button = getByTestId('back-arrow-button');
    expect(button.props.iconProps).toEqual({
      color: `text-[${AMBIENT_NEGATIVE_COLOR}]`,
    });
  });

  it('does not pass iconProps when iconColorClass is undefined', () => {
    const { getByTestId } = render(
      <TokenDetailsInlineHeader onBackPress={mockOnBackPress} />,
    );

    const button = getByTestId('back-arrow-button');
    expect(button.props.iconProps).toBeUndefined();
  });
});
