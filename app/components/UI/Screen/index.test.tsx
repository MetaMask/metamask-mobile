import React from 'react';
import { render } from '@testing-library/react-native';
import { View } from 'react-native';
import Screen from './';

describe('Screen', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <Screen>
        <View>Foobar</View>
      </Screen>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
