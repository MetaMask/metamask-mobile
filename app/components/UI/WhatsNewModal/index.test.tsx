import React from 'react';
import { render } from '@testing-library/react-native';
import WhatsNewModal from './';
import { NavigationContainer } from '@react-navigation/native';

// Mock the useNavigation hook
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
}));

describe('WhatsNewModal', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <NavigationContainer>
        <WhatsNewModal />
      </NavigationContainer>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
