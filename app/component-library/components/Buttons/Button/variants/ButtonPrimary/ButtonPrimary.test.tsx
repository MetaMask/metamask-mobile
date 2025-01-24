// Third party dependencies.
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { lightTheme } from '@metamask/design-tokens';

// Internal dependencies.
import ButtonPrimary from './ButtonPrimary';
import {
  SAMPLE_BUTTONPRIMARY_PROPS,
  BUTTONPRIMARY_TESTID,
} from './ButtonPrimary.constants';

describe('ButtonPrimary', () => {
  it('render matches latest snapshot', () => {
    const { toJSON } = render(
      <ButtonPrimary {...SAMPLE_BUTTONPRIMARY_PROPS} />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
  it('should render the label text', () => {
    const { getByText } = render(
      <ButtonPrimary {...SAMPLE_BUTTONPRIMARY_PROPS} label="Test Button" />,
    );
    expect(getByText('Test Button')).toBeTruthy();
  });

  it('should handle onPressIn and onPressOut events', () => {
    const mockPressIn = jest.fn();
    const mockPressOut = jest.fn();
    const { getByText } = render(
      <ButtonPrimary
        {...SAMPLE_BUTTONPRIMARY_PROPS}
        label="Test Button"
        onPressIn={mockPressIn}
        onPressOut={mockPressOut}
      />,
    );

    const buttonElement = getByText('Test Button');

    fireEvent(buttonElement, 'onPressIn');
    expect(mockPressIn).toHaveBeenCalledTimes(1);

    fireEvent(buttonElement, 'onPressOut');
    expect(mockPressOut).toHaveBeenCalledTimes(1);
  });

  it('should apply the danger styles when isDanger is true', () => {
    const { getByTestId } = render(
      <ButtonPrimary
        {...SAMPLE_BUTTONPRIMARY_PROPS}
        label="Danger Button"
        isDanger
        testID={BUTTONPRIMARY_TESTID}
      />,
    );

    const buttonElement = getByTestId(BUTTONPRIMARY_TESTID);

    expect(buttonElement.props.style.backgroundColor).toBe(
      lightTheme.colors.error.default,
    );
  });
});
