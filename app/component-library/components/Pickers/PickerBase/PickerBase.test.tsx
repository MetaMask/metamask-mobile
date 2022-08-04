import React from 'react';
import { View } from 'react-native';
import { shallow } from 'enzyme';

import PickerBase from './PickerBase';

describe('PickerBase', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <PickerBase onPress={jest.fn}>
        <View />
      </PickerBase>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
