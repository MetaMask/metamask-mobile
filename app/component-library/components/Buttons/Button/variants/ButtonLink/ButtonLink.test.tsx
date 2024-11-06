// Third party dependencies.
import React from 'react';
import { render, screen } from '@testing-library/react-native';

// Internal dependencies.
import ButtonLink from './ButtonLink';

describe('ButtonLink', () => {
  it('should render correctly', () => {
    render(<ButtonLink onPress={jest.fn()} label="I'm a Link!" />);
    expect(screen.toJSON()).toMatchSnapshot();
  });
});
