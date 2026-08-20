import React from 'react';
import { act } from '@testing-library/react-native';
import { View } from 'react-native';
// eslint-disable-next-line import-x/no-namespace
import * as routeMessengerModule from '../messengers/route-messenger';
import { RouteMessengerProvider } from './route-messenger';
import renderWithProvider from '../util/test/renderWithProvider';
import { createMockUIMessenger } from '../util/test/mock-ui-messenger';
import type { UIMessengerActions, UIMessengerEvents } from './ui-messenger';

const CAPABILITIES = {
  actions: [
    'SnapController:installSnaps' as unknown as UIMessengerActions['type'],
  ],
  events: [
    'SnapController:snapInstalled' as unknown as UIMessengerEvents['type'],
  ],
};

describe('RouteMessengerProvider', () => {
  it('renders children once delegation is complete', async () => {
    const uiMessenger = createMockUIMessenger();
    jest.spyOn(uiMessenger, 'delegate').mockResolvedValue(undefined);

    const { findByTestId } = renderWithProvider(
      <RouteMessengerProvider path="TestPath" capabilities={CAPABILITIES}>
        <View testID="child" />
      </RouteMessengerProvider>,
      { uiMessenger },
    );

    expect(await findByTestId('child')).toBeOnTheScreen();
  });

  it('delegates capabilities to the route messenger on mount', async () => {
    const uiMessenger = createMockUIMessenger();
    const delegateSpy = jest
      .spyOn(uiMessenger, 'delegate')
      .mockResolvedValue(undefined);

    const createRouteMessengerSpy = jest.spyOn(
      routeMessengerModule,
      'createRouteMessenger',
    );

    const { findByTestId } = renderWithProvider(
      <RouteMessengerProvider path="SomePath" capabilities={CAPABILITIES}>
        <View testID="content" />
      </RouteMessengerProvider>,
      { uiMessenger },
    );

    // Wait for delegation to complete.
    await findByTestId('content');

    expect(createRouteMessengerSpy).toHaveBeenCalledWith({ path: 'SomePath' });
    expect(delegateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        actions: CAPABILITIES.actions,
        events: CAPABILITIES.events,
      }),
    );
  });

  it('revokes delegation when the component unmounts', async () => {
    const uiMessenger = createMockUIMessenger();
    jest.spyOn(uiMessenger, 'delegate').mockResolvedValue(undefined);

    const revokeSpy = jest
      .spyOn(uiMessenger, 'revoke')
      .mockResolvedValue(undefined);

    const { findByTestId, unmount } = renderWithProvider(
      <RouteMessengerProvider path="SomePath" capabilities={CAPABILITIES}>
        <View testID="content" />
      </RouteMessengerProvider>,
      { uiMessenger },
    );

    // Wait for delegation to complete before unmounting.
    await findByTestId('content');

    await act(async () => {
      unmount();
    });

    expect(revokeSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        actions: CAPABILITIES.actions,
        events: CAPABILITIES.events,
      }),
    );
  });
});
