import React from 'react';
import { render } from '@testing-library/react-native';
import ImportPrivateKey from './';
import { NavigationContainer } from '@react-navigation/native';

describe('ImportPrivateKey', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <NavigationContainer>
        <ImportPrivateKey route={{ params: {} }} />
      </NavigationContainer>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
