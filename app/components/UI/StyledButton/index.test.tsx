import React from 'react';
import { StyleSheet } from 'react-native';
import { render } from '@testing-library/react-native';
import StyledButtonIOS from './index.ios';
import StyledButtonAndroid from './index.android';
import getStyles from './styledButtonStyles';
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
      const { getByRole } = render(
        <ThemeContext.Provider value={mockTheme}>
          <StyledButtonIOS type={type} />
        </ThemeContext.Provider>,
      );
      expect(getByRole('button')).toBeOnTheScreen();
    });
  });

  buttonTypes.forEach((type) => {
    it(`should render correctly on Android the button with type ${type}`, () => {
      const { getByRole } = render(
        <ThemeContext.Provider value={mockTheme}>
          <StyledButtonAndroid type={type} />
        </ThemeContext.Provider>,
      );
      expect(getByRole('button')).toBeOnTheScreen();
    });
  });

  it.each(buttonTypes)(
    'renders %s buttons with fully rounded corners',
    (type) => {
      const { containerStyle } = getStyles(type, mockTheme.colors);

      const flattenedContainerStyle = StyleSheet.flatten(containerStyle);

      expect(flattenedContainerStyle).toMatchObject({ borderRadius: 9999 });
    },
  );
});
