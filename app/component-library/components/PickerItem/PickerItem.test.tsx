import React from 'react';
import { View } from 'react-native';
import { shallow } from 'enzyme';
import PickerItem from './PickerItem';

describe('PickerItem', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <PickerItem onPress={jest.fn}>
        <View />
      </PickerItem>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
