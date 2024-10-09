import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';

import Routes from '../../../constants/navigation/Routes';
import ShowTokenIdSheet from './ShowTokenIdSheet';

const initialState = {
  engine: {
    backgroundState,
  },
};

const Stack = createNativeStackNavigator();

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
