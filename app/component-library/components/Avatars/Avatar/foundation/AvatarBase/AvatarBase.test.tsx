// Third party dependencies.
import React from 'react';
import { Image } from 'react-native';
import { render } from '@testing-library/react-native';

// Internal dependencies.
import AvatarBase from './AvatarBase';
import { SAMPLE_AVATARBASE_IMAGESOURCE } from './AvatarBase.constants';

describe('AvatarBase', () => {
  it('should render correctly', () => {
    const wrapper = render(
      <AvatarBase>
        <Image source={SAMPLE_AVATARBASE_IMAGESOURCE} />
      </AvatarBase>,
    );

    expect(wrapper).toMatchSnapshot();
  });
});
