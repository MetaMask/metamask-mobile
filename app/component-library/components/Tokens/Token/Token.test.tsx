// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// External dependencies.
// eslint-disable-next-line
// @ts-ignore
import { AvatarSizes } from '../../Avatar.types';

// Internal dependencies.
import Token from './Token';
import { TEST_TOKEN_NAME, TEST_TOKEN_IMAGE_PROPS } from './Token.constants';

describe('Token', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Token
        size={AvatarSizes.Xl}
        name={TEST_TOKEN_NAME}
        imageProps={TEST_TOKEN_IMAGE_PROPS}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
