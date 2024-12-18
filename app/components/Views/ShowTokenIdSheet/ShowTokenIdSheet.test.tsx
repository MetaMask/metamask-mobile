import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';

import Routes from '../../../constants/navigation/Routes';
import ShowTokenIdSheet from './ShowTokenIdSheet';

const initialState = {
  engine: {
    backgroundState,
  },
};

const Stack = createStackNavigator();

describe('ShowTokenId', () => {
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(
      <Stack.Navigator>
        <Stack.Screen name={Routes.SHEET.SHOW_TOKEN_ID}>
          {() => <ShowTokenIdSheet />}
        </Stack.Screen>
      </Stack.Navigator>,
      {
        state: initialState,
      },
    );

    expect(toJSON()).toMatchSnapshot();
  });
});
