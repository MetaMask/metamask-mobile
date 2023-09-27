import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import renderWithProvider from '../../../util/test/renderWithProvider';
import initialBackgroundState from '../../../util/test/initial-background-state.json';

import ShowNFTSheet from './ShowNFTSheet';
import Routes from '../../../constants/navigation/Routes';

const initialState = {
  engine: {
    backgroundState: initialBackgroundState,
  },
};

const Stack = createStackNavigator();

describe('ShowNftSheet', () => {
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(
      <Stack.Navigator>
        <Stack.Screen name={Routes.SHEET.SHOW_NFT}>
          {() => <ShowNFTSheet />}
        </Stack.Screen>
      </Stack.Navigator>,
      {
        state: initialState,
      },
    );

    expect(toJSON()).toMatchSnapshot();
  });
});
