// Third party dependencies.
import React from 'react';
import { render } from '@testing-library/react-native';

// Internal dependencies.
import ButtonLink from './ButtonLink';

describe('Link', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <ButtonLink onPress={jest.fn} label={`I'm a Link!`} />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
