// Third party dependencies.
import React from 'react';
import { View } from 'react-native';
import { shallow } from 'enzyme';

// Internal dependencies.
import Toggle from './Toggle';

describe('Toggle - Snapshot', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Toggle>
        <View />
      </Toggle>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
