// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// External dependencies.
import { AvatarSizes } from '../..';

// Internal dependencies.
import AvatarBlockies from './AvatarBlockies';
import { DUMMY_WALLET_ADDRESS } from './AvatarBlockies.constants';

describe('AvatarBlockies', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <AvatarBlockies
        size={AvatarSizes.Xl}
        accountAddress={DUMMY_WALLET_ADDRESS}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
