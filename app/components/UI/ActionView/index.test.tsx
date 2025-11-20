import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import ActionView from './';
import { Text, View } from 'react-native';

const ActionViewComponent = () => (
  <ActionView>
    <View accessibilityRole="none" accessible={false}>
      <Text>Confirm</Text>
    </View>
  </ActionView>
);

describe('ActionView', () => {
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(<ActionViewComponent />);
    expect(toJSON()).toMatchSnapshot();
  });
});
