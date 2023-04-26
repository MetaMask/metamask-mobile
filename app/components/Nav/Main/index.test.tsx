import React from 'react';
import { render } from '@testing-library/react-native';
// eslint-disable-next-line import/named
import { NavigationContainer } from '@react-navigation/native';
import Main from './';

describe('Main', () => {
  it('should render correctly', () => {
    const MainAppContainer = () => (
      <NavigationContainer>
        <Main />
      </NavigationContainer>
    );
    const { toJSON } = render(<MainAppContainer />);
    expect(toJSON()).toMatchSnapshot();
  });
});
