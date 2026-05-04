import React from 'react';
// eslint-disable-next-line import-x/no-namespace
import * as routeMessengerModule from '../messengers/route-messenger';
import { RouteWithMessenger } from './route-with-messenger';
import renderWithProvider, {
  renderScreen,
} from '../util/test/renderWithProvider';
import { View } from 'react-native';

describe('RouteWithMessenger', () => {
  it('renders children and provides a route messenger', () => {
    const { getByTestId } = renderWithProvider(
      <RouteWithMessenger
        path="/test"
        capabilities={{
          actions: ['SnapController:installSnaps'],
        }}
      >
        <View testID="child" />
      </RouteWithMessenger>,
    );

    expect(getByTestId('child')).toBeOnTheScreen();
  });

  it('creates a route messenger with the correct path and capabilities', () => {
    const createRouteMessengerSpy = jest.spyOn(
      routeMessengerModule,
      'createRouteMessenger',
    );

    const Component = () => (
      <RouteWithMessenger
        path="SomePath"
        capabilities={{
          actions: ['SnapController:installSnaps'],
          events: ['SnapController:snapInstalled'],
        }}
      >
        <div />
      </RouteWithMessenger>
    );

    renderScreen(Component, {
      name: 'SomePath',
    });

    expect(createRouteMessengerSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        path: 'SomePath',
        capabilities: {
          actions: ['SnapController:installSnaps'],
          events: ['SnapController:snapInstalled'],
        },
      }),
    );
  });
});
