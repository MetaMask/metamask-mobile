// eslint-disable-next-line import-x/no-namespace
import * as messengerModule from '@metamask/messenger';
import {
  createRouteMessenger,
  getRouteMessengerNamespace,
} from './route-messenger';

describe('getRouteMessengerNamespace', () => {
  it.each([
    ['SomePath', 'SomePathRoute'],
    ['AnotherExample', 'AnotherExampleRoute'],
    ['', 'Route'],
  ])(
    'derives the correct namespace from the path "%s"',
    (path, expectedNamespace) => {
      expect(getRouteMessengerNamespace(path)).toBe(expectedNamespace);
    },
  );
});

describe('createRouteMessenger', () => {
  it('creates a route messenger with the correct namespace', () => {
    const OriginalMessenger = messengerModule.Messenger;
    const MessengerSpy = jest
      .spyOn(messengerModule, 'Messenger')
      .mockImplementation(
        (...args: ConstructorParameters<typeof messengerModule.Messenger>) =>
          new OriginalMessenger(...args),
      );

    createRouteMessenger({ path: 'SomePath' });

    expect(MessengerSpy).toHaveBeenCalledWith({
      namespace: 'SomePathRoute',
      captureException: expect.any(Function),
    });
  });
});
