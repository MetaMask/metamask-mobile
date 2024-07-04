import React from 'react';
import { SafeAreaView } from 'react-native';
import { render } from '@testing-library/react-native';
import ReusableModal from './';
import { NavigationContainer } from '@react-navigation/native';

// Mock the useNavigation hook
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
}));

describe('ReusableModal', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <NavigationContainer>
        <SafeAreaView>
          <ReusableModal>{null}</ReusableModal>
        </SafeAreaView>
      </NavigationContainer>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
