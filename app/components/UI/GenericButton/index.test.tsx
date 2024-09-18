import React from 'react';
import { shallow } from 'enzyme';
import GenericButtonIos from './index.ios';
import GenericButtonAndroid from './index.android';

describe('GenericButton', () => {
  it('should render correctly on iOS', () => {
    const wrapper = shallow(<GenericButtonIos />);
    expect(wrapper).toMatchSnapshot();
  });

  it('should render correctly on android', () => {
    jest.doMock('react-native/Libraries/Utilities/Platform', () => ({
      OS: 'android',
    }));
    const mockOnPress = jest.fn();
    const wrapper = shallow(
      <GenericButtonAndroid onPress={mockOnPress}>
        Test Button
      </GenericButtonAndroid>
    );
    expect(wrapper).toMatchSnapshot();
  });
});
