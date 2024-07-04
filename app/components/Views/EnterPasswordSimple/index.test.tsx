import React from 'react';
import { render } from '@testing-library/react-native';
import EnterPasswordSimple from './';
import { NavigationContainer } from '@react-navigation/native';

describe('EnterPasswordSimple', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <NavigationContainer>
        <EnterPasswordSimple route={{ params: {} }} />
      </NavigationContainer>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
