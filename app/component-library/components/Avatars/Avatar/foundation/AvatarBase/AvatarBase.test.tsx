// Third party dependencies.
import React from 'react';
import { Image } from 'react-native';
import { shallow } from 'enzyme';

// External dependencies.
import { toDataUrl } from '../../../../../../util/blockies';

// Internal dependencies.
import AvatarBase from './AvatarBase';
import { AvatarSize } from '../../Avatar.types';
import { DUMMY_IMAGE_DATA } from './AvatarBase.constants';

describe('AvatarBase', () => {
  it('should render correctly', () => {
    const blockieStyles = {
      flex: 1,
    };
    const wrapper = shallow(
      <AvatarBase size={AvatarSize.Xl}>
        <Image
          source={{ uri: toDataUrl(DUMMY_IMAGE_DATA) }}
          style={blockieStyles}
        />
      </AvatarBase>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
