import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import renderWithProvider from '../../../util/test/renderWithProvider';
import initialBackgroundState from '../../../util/test/initial-background-state.json';

import ShowIpfsGatewaySheet from './ShowIpfsGatewaySheet';
import Routes from '../../../constants/navigation/Routes';

const initialState = {
  engine: {
    backgroundState: initialBackgroundState,
  },
};

const Stack = createStackNavigator();

describe('ShowIpfsGatewaySheet', () => {
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(
      <Stack.Navigator>
        <Stack.Screen name={Routes.SHEET.SHOW_IPFS}>
          {() => <ShowIpfsGatewaySheet />}
        </Stack.Screen>
      </Stack.Navigator>,
      {
        state: initialState,
      },
    );

    expect(toJSON()).toMatchSnapshot();
  });
});
