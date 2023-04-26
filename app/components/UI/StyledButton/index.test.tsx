import React from 'react';
import { render } from '@testing-library/react-native';
import StyledButtonIOS from './index.ios';
import StyledButtonAndroid from './index.android';

describe('StyledButton', () => {
  const buttonTypes = ['normal', 'confirm', 'orange', 'cancel'];

  buttonTypes.forEach((type) => {
    it(`should render correctly on iOS the button with type ${type}`, () => {
      const { toJSON } = render(<StyledButtonIOS type={type} />);
      expect(toJSON()).toMatchSnapshot();
    });
  });

  buttonTypes.forEach((type) => {
    it(`should render correctly on Android the button with type ${type}`, () => {
      const { toJSON } = render(<StyledButtonAndroid type={type} />);
      expect(toJSON()).toMatchSnapshot();
    });
  });
});
