import React from 'react';
import { render, screen } from '@testing-library/react-native';
import WhatsNewModal from './';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { ThemeContext } from '../../../util/theme';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
}));

const mockTheme = {
  colors: {
    icon: { default: 'red' },
    background: { default: 'white' },
    primary: { default: 'blue' },
    warning: { default: 'yellow' },
    alternative: { default: 'orange' },
    text: { alternative: 'orange' },
    error: { default: 'red' },
    overlay: { default: 'green' },
  },
  themeAppearance: 'light',
};

describe('WhatsNewModal', () => {
  beforeEach(() => {
    (useNavigation as jest.Mock).mockReturnValue({
      navigate: jest.fn(),
      goBack: jest.fn(),
    });
  });

  it('should render correctly', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ThemeContext.Provider value={mockTheme}>
        {children}
      </ThemeContext.Provider>
    );

    render(
      <NavigationContainer>
        <WhatsNewModal />
      </NavigationContainer>,
      { wrapper },
    );
    expect(screen.toJSON()).toMatchSnapshot();
  });
});
