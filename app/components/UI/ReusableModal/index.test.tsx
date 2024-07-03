import React from 'react';
import { SafeAreaView } from 'react-native';
import { render } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import ReusableModal from './';

const mockNavigation = {
  goBack: jest.fn(),
};

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => mockNavigation,
  };
});

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
