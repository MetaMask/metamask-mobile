import React from 'react';
import { withMessenger } from './route-messenger-helpers';

describe('withMessenger', () => {
  const FooComponent = () => <div>Foo</div>;

  it('returns a Route component with the expected shape', () => {
    const Route = withMessenger(FooComponent, {
      capabilities: {
        actions: ['SnapController:installSnaps'],
        events: ['SnapController:snapInstalled'],
      },
    });

    expect(
      <Route
        route={{
          key: 'test-route',
          name: 'TestRoute',
        }}
        navigation={{
          addListener: jest.fn(),
          canGoBack: jest.fn(),
          dispatch: jest.fn(),
          isFocused: jest.fn(),
          getId: jest.fn(),
          getParent: jest.fn(),
          getState: jest.fn(),
          goBack: jest.fn(),
          navigate: jest.fn(),
          removeListener: jest.fn(),
          reset: jest.fn(),
          setOptions: jest.fn(),
          setParams: jest.fn(),
        }}
      />,
    ).toMatchInlineSnapshot(`
      <RouteWithMessengerElement
        navigation={
          {
            "addListener": [MockFunction],
            "canGoBack": [MockFunction],
            "dispatch": [MockFunction],
            "getId": [MockFunction],
            "getParent": [MockFunction],
            "getState": [MockFunction],
            "goBack": [MockFunction],
            "isFocused": [MockFunction],
            "navigate": [MockFunction],
            "removeListener": [MockFunction],
            "reset": [MockFunction],
            "setOptions": [MockFunction],
            "setParams": [MockFunction],
          }
        }
        route={
          {
            "key": "test-route",
            "name": "TestRoute",
          }
        }
      />
    `);
  });
});
