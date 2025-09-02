// Third party dependencies.
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// Internal dependencies.
import ButtonSemantic from './ButtonSemantic';
import { ButtonSemanticSeverity } from './ButtonSemantic.types';

describe('ButtonSemantic', () => {
  it('renders correctly with Success severity', () => {
    const { toJSON, getByText } = render(
      <ButtonSemantic
        severity={ButtonSemanticSeverity.Success}
        onPress={jest.fn()}
      >
        Success Button
      </ButtonSemantic>,
    );

    expect(getByText('Success Button')).toBeTruthy();
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders correctly with Danger severity', () => {
    const { toJSON, getByText } = render(
      <ButtonSemantic
        severity={ButtonSemanticSeverity.Danger}
        onPress={jest.fn()}
      >
        Danger Button
      </ButtonSemantic>,
    );

    expect(getByText('Danger Button')).toBeTruthy();
    expect(toJSON()).toMatchSnapshot();
  });

  it('calls onPress handler when pressed', () => {
    const mockOnPress = jest.fn();
    const { getByText } = render(
      <ButtonSemantic
        severity={ButtonSemanticSeverity.Success}
        onPress={mockOnPress}
      >
        Test Button
      </ButtonSemantic>,
    );

    fireEvent.press(getByText('Test Button'));
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('renders in disabled state', () => {
    const mockOnPress = jest.fn();
    const { getByText } = render(
      <ButtonSemantic
        severity={ButtonSemanticSeverity.Success}
        onPress={mockOnPress}
        isDisabled={true}
      >
        Disabled Button
      </ButtonSemantic>,
    );

    const button = getByText('Disabled Button');
    expect(button).toBeTruthy();

    fireEvent.press(button);
    expect(mockOnPress).not.toHaveBeenCalled();
  });

  it('renders in loading state', () => {
    const { getByText } = render(
      <ButtonSemantic
        severity={ButtonSemanticSeverity.Success}
        onPress={jest.fn()}
        isLoading={true}
        loadingText="Loading..."
      >
        Test Button
      </ButtonSemantic>,
    );

    expect(getByText('Loading...')).toBeTruthy();
  });
});
