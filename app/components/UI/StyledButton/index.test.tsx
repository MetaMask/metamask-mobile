import React from 'react';
import { shallow } from 'enzyme';
import StyledButtonIOS from './index.ios';
import StyledButtonAndroid from './index.android';

describe('StyledButton', () => {
  const buttonTypes = ['normal', 'confirm', 'orange', 'cancel'];

  buttonTypes.forEach((type) => {
    it(`should render correctly on iOS the button with type ${type}`, () => {
      const wrapper = shallow(<StyledButtonIOS type={type} />);
      expect(wrapper).toMatchSnapshot();
    });
  });

  buttonTypes.forEach((type) => {
    it(`should render correctly on Android the button with type ${type}`, () => {
      const wrapper = shallow(<StyledButtonAndroid type={type} />);
      expect(wrapper).toMatchSnapshot();
    });
  });
});
