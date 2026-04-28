import React from 'react';
import { shallow } from 'enzyme';
import GenericButtonIos from './index.ios';
import GenericButtonAndroid from './index.android';

describe('GenericButton', () => {
  it('should render correctly on iOS', () => {
    const wrapper = shallow(<GenericButtonIos />);
    expect(wrapper.find('TouchableOpacity').exists()).toBe(true);
  });

  it('should render correctly on android', () => {
    jest.doMock('react-native/Libraries/Utilities/Platform', () => ({
      OS: 'android',
    }));
    const wrapper = shallow(<GenericButtonAndroid />);
    expect(wrapper.find('TouchableNativeFeedback').exists()).toBe(true);
  });
});
