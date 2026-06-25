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

jest.mock('../../../../../component-library/components/Icons/Icon', () => {
  const { createElement } = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');

  return {
    __esModule: true,
    default: ({ name }: { name: string }) => createElement(Text, null, name),
    IconName: { Arrow2Down: 'Arrow2Down' },
  };
});

jest.mock(
  '../../../../../component-library/components/Buttons/ButtonIcon/ButtonIcon.constants',
  () => ({
    DEFAULT_BUTTONICON_ICONCOLOR: 'Default',
    ICONSIZE_BY_BUTTONICONSIZE: { Lg: 'Lg' },
  }),
);

jest.mock(
  '../../../../../component-library/components/Buttons/ButtonIcon',
  () => ({
    ButtonIconSizes: { Lg: 'Lg' },
  }),
);

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
