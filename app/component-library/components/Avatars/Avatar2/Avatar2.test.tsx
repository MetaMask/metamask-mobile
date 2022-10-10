// Third party dependencies.
import React from 'react';
import { View } from 'react-native';
import { shallow } from 'enzyme';

// Internal dependencies.
import Avatar2 from './Avatar2';

describe('Avatar2 - Snapshot', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Avatar2>
        <View />
      </Avatar2>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
