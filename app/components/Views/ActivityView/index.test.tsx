import React from 'react';
import ActivityView from '.';
import { backgroundState } from '../../../util/test/initial-root-state';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { createStackNavigator } from '@react-navigation/stack';

// Mock the navigation object.
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
      setOptions: jest.fn(),
    }),
  };
});

const Stack = createStackNavigator();

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const renderComponent = (state: any = {}) =>
  renderWithProvider(
    <Stack.Navigator>
      <Stack.Screen name="Amount" options={{}}>
        {() => <ActivityView />}
      </Stack.Screen>
    </Stack.Navigator>,
    { state },
  );

const mockInitialState = {
  wizard: {
    step: 1,
  },
  engine: {
    backgroundState,
  },
};

describe('ActivityView', () => {
  it('should render correctly', () => {
    const { toJSON } = renderComponent(mockInitialState);
    expect(toJSON()).toMatchSnapshot();
  });
});
