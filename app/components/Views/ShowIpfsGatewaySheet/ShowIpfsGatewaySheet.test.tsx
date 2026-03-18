import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';

import ShowIpfsGatewaySheet from './ShowIpfsGatewaySheet';
import Routes from '../../../constants/navigation/Routes';

const initialState = {
  engine: {
    backgroundState,
  },
};

const Stack = createStackNavigator();

describe('ShowIpfsGatewaySheet', () => {
  it('should render correctly', () => {
    const component = renderWithProvider(
      <Stack.Navigator>
        <Stack.Screen name={Routes.SHEET.SHOW_IPFS}>
          {() => <ShowIpfsGatewaySheet />}
        </Stack.Screen>
      </Stack.Navigator>,
      {
        state: initialState,
      },
    );

    expect(component).toMatchSnapshot();
  });
});
