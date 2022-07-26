import React from 'react';
import { View } from 'react-native';
import { shallow } from 'enzyme';
import SheetHeader from './SheetHeader';

describe('SheetHeader', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <SheetHeader onPress={jest.fn}>
        <View />
      </SheetHeader>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
