// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// External dependencies.
// eslint-disable-next-line
// @ts-ignore
import { AvatarSize } from '../../Avatar.types';

// Internal dependencies.
import AvatarToken from './AvatarToken';
import {
  TEST_TOKEN_NAME,
  TEST_REMOTE_IMAGE_SOURCE,
} from './AvatarToken.constants';

describe('AvatarToken', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <AvatarToken
        size={AvatarSize.Xl}
        name={TEST_TOKEN_NAME}
        imageSource={TEST_REMOTE_IMAGE_SOURCE}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
