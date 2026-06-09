// Third party dependencies.
import React from 'react';
import { render } from '@testing-library/react-native';

// Internal dependencies.
import ButtonPill from './ButtonPill';

describe('ButtonPill', () => {
  it('renders with default props', () => {
    const { getByTestId } = render(
      <ButtonPill onPress={jest.fn} testID="button-pill" />,
    );
    expect(getByTestId('button-pill')).toBeOnTheScreen();
  });
});
