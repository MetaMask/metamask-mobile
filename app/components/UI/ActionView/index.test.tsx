import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import ActionView from './';
import { Text, View } from 'react-native';

const ActionViewComponent = () => (
  <ActionView>
    <View>
      <Text>Confirm</Text>
    </View>
  </ActionView>
);

describe('ActionView', () => {
  it('should render correctly', () => {
    const component = renderWithProvider(<ActionViewComponent />);
    expect(component).toMatchSnapshot();
  });
});
