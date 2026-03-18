import React from 'react';
import { render } from '@testing-library/react-native';
import StyledButtonIOS from './index.ios';
import StyledButtonAndroid from './index.android';
import { ThemeContext, mockTheme } from '../../../util/theme';

describe('StyledButton', () => {
  const buttonTypes = [
    'normal',
    'confirm',
    'orange',
    'cancel',
    'secondary',
    'onOverlay',
    'danger',
    'info',
    'transparent',
    'inverse-transparent',
  ];

  buttonTypes.forEach((type) => {
    it(`should render correctly on iOS the button with type ${type}`, () => {
      const component = render(
        <ThemeContext.Provider value={mockTheme}>
          <StyledButtonIOS type={type} />
        </ThemeContext.Provider>,
      );
      expect(component).toMatchSnapshot();
    });
  });

  buttonTypes.forEach((type) => {
    it(`should render correctly on Android the button with type ${type}`, () => {
      const component = render(
        <ThemeContext.Provider value={mockTheme}>
          <StyledButtonAndroid type={type} />
        </ThemeContext.Provider>,
      );
      expect(component).toMatchSnapshot();
    });
  });
});
