import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { FLipQuoteButton } from '.';

jest.mock('../../../../../component-library/hooks', () => ({
  useStyles: jest.fn(() => ({
    styles: {
      arrowContainer: {},
      arrowCircle: {},
      button: {},
    },
  })),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const { createElement } = jest.requireActual('react');
  const { Text, View } = jest.requireActual('react-native');

  return {
    __esModule: true,
    Box: ({ children, style }: { children: React.ReactNode; style?: object }) =>
      createElement(View, { style }, children),
    Icon: ({ name }: { name: string }) => createElement(Text, null, name),
    IconColor: { IconDefault: 'IconDefault' },
    IconName: { Arrow2Down: 'Arrow2Down' },
    IconSize: { Lg: '24' },
  };
});

describe('FLipQuoteButton', () => {
  it('calls onPress when enabled', () => {
    const mockOnPress = jest.fn();
    const { getByTestId, getByText } = render(
      <FLipQuoteButton onPress={mockOnPress} disabled={false} />,
    );

    expect(getByText('Arrow2Down')).toBeOnTheScreen();
    fireEvent.press(getByTestId('arrow-button'));

    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', () => {
    const mockOnPress = jest.fn();
    const { getByTestId } = render(
      <FLipQuoteButton onPress={mockOnPress} disabled />,
    );

    fireEvent.press(getByTestId('arrow-button'));

    expect(mockOnPress).not.toHaveBeenCalled();
  });
});
