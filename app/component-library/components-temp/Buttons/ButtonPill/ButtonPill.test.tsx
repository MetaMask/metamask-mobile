// Third party dependencies.
import React from 'react';
import { render } from '@testing-library/react-native';

// Internal dependencies.
import ButtonPill from './ButtonPill';

describe('ButtonPill', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <ButtonPill onPress={jest.fn} />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
