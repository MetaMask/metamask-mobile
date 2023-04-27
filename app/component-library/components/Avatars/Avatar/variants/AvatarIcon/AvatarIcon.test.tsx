// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// External dependencies.
import AvatarIcon from './AvatarIcon';

// Internal dependencies.
import { AvatarSize } from '../../Avatar.types';
import { IconName } from '../../../../Icons/Icon';

describe('AvatarIcon', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <AvatarIcon size={AvatarSize.Lg} name={IconName.AddSquare} />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
