import React from 'react';
import { render } from '@testing-library/react-native';
import ImportPrivateKey from './';
import { NavigationContainer } from '@react-navigation/native';

describe('ImportPrivateKey', () => {
  it('should render correctly', () => {
    const wrapper = render(
      <NavigationContainer>
        <ImportPrivateKey />
      </NavigationContainer>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
