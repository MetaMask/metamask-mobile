// Third party dependencies.
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// External dependencies.
import { ButtonSize } from '../../Button.types';
import { IconName } from '../../../../Icons/Icon';

// Internal dependencies.
import ButtonSecondary from './ButtonSecondary';
import { SAMPLE_BUTTONSECONDARY_PROPS } from './ButtonSecondary.constants';

describe('ButtonSecondary', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <ButtonSecondary
        startIconName={IconName.Bank}
        size={ButtonSize.Md}
        label={'Click me!'}
        onPress={() => null}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('render matches latest snapshot', () => {
    const { toJSON } = render(
      <ButtonSecondary {...SAMPLE_BUTTONSECONDARY_PROPS} />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('should render the label text', () => {
    const { getByText } = render(
      <ButtonSecondary {...SAMPLE_BUTTONSECONDARY_PROPS} label="Test Button" />,
    );
    expect(getByText('Test Button')).toBeTruthy();
  });

  it('should handle onPressIn and onPressOut events', () => {
    const mockPressIn = jest.fn();
    const mockPressOut = jest.fn();
    const { getByText } = render(
      <ButtonSecondary
        {...SAMPLE_BUTTONSECONDARY_PROPS}
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
      <ButtonSecondary
        {...SAMPLE_BUTTONSECONDARY_PROPS}
        label="Danger Button"
        isDanger
        testID="button-secondary"
      />,
    );

    const buttonElement = getByTestId('button-secondary');
    expect(buttonElement).toBeTruthy();
  });

  it('should apply the inverse styles when isInverse is true', () => {
    const { getByTestId } = render(
      <ButtonSecondary
        {...SAMPLE_BUTTONSECONDARY_PROPS}
        label="Inverse Button"
        isInverse
        testID="button-secondary"
      />,
    );

    const buttonElement = getByTestId('button-secondary');
    expect(buttonElement).toBeTruthy();
  });

  it('should apply both inverse and danger styles when both props are true', () => {
    const { getByTestId } = render(
      <ButtonSecondary
        {...SAMPLE_BUTTONSECONDARY_PROPS}
        label="Inverse Danger Button"
        isInverse
        isDanger
        testID="button-secondary"
      />,
    );

    const buttonElement = getByTestId('button-secondary');
    expect(buttonElement).toBeTruthy();
  });

  it('should show loading indicator when loading prop is true', () => {
    const { getByTestId } = render(
      <ButtonSecondary
        {...SAMPLE_BUTTONSECONDARY_PROPS}
        label="Loading Button"
        loading
        testID="button-secondary"
      />,
    );

    const buttonElement = getByTestId('button-secondary');
    expect(buttonElement).toBeTruthy();
  });

  it('should use default props when not specified', () => {
    const { getByText } = render(
      <ButtonSecondary
        {...SAMPLE_BUTTONSECONDARY_PROPS}
        label="Default Button"
      />,
    );

    expect(getByText('Default Button')).toBeTruthy();
  });
});
