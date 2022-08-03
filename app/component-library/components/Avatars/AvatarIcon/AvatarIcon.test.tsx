import React from 'react';
import { shallow } from 'enzyme';

import AvatarIcon from './AvatarIcon';

import { AvatarBaseSize } from '../AvatarBase';
import { IconName } from '../../Icon';

describe('AvatarIcon', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <AvatarIcon size={AvatarBaseSize.Lg} icon={IconName.AddSquareFilled} />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
