// Third party dependencies.
import React from 'react';
import { View } from 'react-native';
import { shallow } from 'enzyme';

// Internal dependencies.
import Card from './Card';

describe('Card - Snapshot', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Card>
        <View />
      </Card>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
