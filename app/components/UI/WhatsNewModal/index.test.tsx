import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import WhatsNewModal from './';
import { createStackNavigator } from '@react-navigation/stack';

const Stack = createStackNavigator();

describe('WhatsNewModal', () => {
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(
      <Stack.Navigator>
        <Stack.Screen name="WhatsNewModal" component={WhatsNewModal} />
      </Stack.Navigator>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
