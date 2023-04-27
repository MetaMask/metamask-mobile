import React from 'react';
import { shallow } from 'enzyme';
import { View } from 'react-native';
import Screen from './';

describe('Screen', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Screen>
        <View>Foobar</View>
      </Screen>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
