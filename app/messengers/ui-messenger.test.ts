import {
  Messenger,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import {
  UIMessenger,
  type UIMessengerActions,
  type UIMessengerEvents,
} from './ui-messenger';
import Engine from '../core/Engine';

jest.mock('../core/Engine', () => ({
  controllerMessenger: {
    call: jest.fn(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  },
}));

/**
 * Create a delegatee messenger for testing. Uses MOCK_ANY_NAMESPACE to avoid
 * namespace restrictions.
 */
function createDelegatee() {
  return new Messenger<MockAnyNamespace, UIMessengerActions, UIMessengerEvents>(
    { namespace: MOCK_ANY_NAMESPACE },
  );
}

describe('UIMessenger', () => {
  let uiMessenger: UIMessenger;
  let mockCall: jest.Mock;
  let mockSubscribe: jest.Mock;
  let mockUnsubscribe: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    uiMessenger = new UIMessenger();
    mockCall = jest.mocked(Engine.controllerMessenger.call);
    mockSubscribe = jest.mocked(Engine.controllerMessenger.subscribe);
    mockUnsubscribe = jest.mocked(Engine.controllerMessenger.unsubscribe);
  });

  describe('delegate', () => {
    describe('actions', () => {
      it('registers a handler on the delegatee that routes to the background', async () => {
        const delegatee = createDelegatee();
        mockCall.mockReturnValue('result');

        await uiMessenger.delegate({
          actions: ['SnapController:installSnaps'],
          messenger: delegatee,
        });

        const result = await delegatee.call(
          'SnapController:installSnaps',
          'metamask',
          {},
        );

        expect(mockCall).toHaveBeenCalledWith(
          'SnapController:installSnaps',
          'metamask',
          {},
        );
        expect(result).toBe('result');
      });

      it('throws if an excluded action is called', async () => {
        const delegatee = createDelegatee();

        await uiMessenger.delegate({
          // @ts-expect-error: Excluded action for testing purposes.
          actions: ['KeyringController:addNewKeyring'],
          messenger: delegatee,
        });

        // @ts-expect-error: Excluded action for testing purposes.
        expect(() => delegatee.call('KeyringController:addNewKeyring')).toThrow(
          `The action "KeyringController:addNewKeyring" has not been exposed to the UI.`,
        );
      });

      it('throws if the same action is delegated to the same messenger twice', async () => {
        const delegatee = createDelegatee();

        await uiMessenger.delegate({
          actions: ['SnapController:installSnaps'],
          messenger: delegatee,
        });

        await expect(
          uiMessenger.delegate({
            actions: ['SnapController:installSnaps'],
            messenger: delegatee,
          }),
        ).rejects.toThrow(
          `The action "${'SnapController:installSnaps'}" has already been delegated to this messenger.`,
        );
      });

      it('allows the same action to be delegated to different messengers', async () => {
        const delegatee1 = createDelegatee();
        const delegatee2 = createDelegatee();

        await expect(
          Promise.all([
            uiMessenger.delegate({
              actions: ['SnapController:installSnaps'],
              messenger: delegatee1,
            }),
            uiMessenger.delegate({
              actions: ['SnapController:installSnaps'],
              messenger: delegatee2,
            }),
          ]),
        ).resolves.not.toThrow();
      });
    });

    describe('events', () => {
      it('subscribes to the event via Engine.controllerMessenger', async () => {
        const delegatee = createDelegatee();

        await uiMessenger.delegate({
          events: ['SnapController:snapInstalled'],
          messenger: delegatee,
        });

        expect(mockSubscribe).toHaveBeenCalledWith(
          'SnapController:snapInstalled',
          expect.any(Function),
        );
      });

      it('publishes background events to the delegatee', async () => {
        const delegatee = createDelegatee();
        const handler = jest.fn();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (delegatee as any).subscribe('SnapController:snapInstalled', handler);

        let capturedCallback!: (...args: unknown[]) => void;
        mockSubscribe.mockImplementation(
          (_event: string, callback: unknown) => {
            capturedCallback = callback as (...args: unknown[]) => void;
          },
        );

        await uiMessenger.delegate({
          events: ['SnapController:snapInstalled'],
          messenger: delegatee,
        });

        capturedCallback();

        expect(handler).toHaveBeenCalled();
      });

      it('throws if the same event is delegated to the same messenger twice', async () => {
        const delegatee = createDelegatee();

        await uiMessenger.delegate({
          events: ['SnapController:snapInstalled'],
          messenger: delegatee,
        });

        await expect(
          uiMessenger.delegate({
            events: ['SnapController:snapInstalled'],
            messenger: delegatee,
          }),
        ).rejects.toThrow(
          `The event 'SnapController:snapInstalled' has already been delegated to this messenger`,
        );
      });

      it('creates independent background subscriptions for different messengers', async () => {
        const delegatee1 = createDelegatee();
        const delegatee2 = createDelegatee();

        await uiMessenger.delegate({
          events: ['SnapController:snapInstalled'],
          messenger: delegatee1,
        });
        await uiMessenger.delegate({
          events: ['SnapController:snapInstalled'],
          messenger: delegatee2,
        });

        expect(mockSubscribe).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('revoke', () => {
    describe('actions', () => {
      it('unregisters the action handler from the delegatee', async () => {
        const delegatee = createDelegatee();

        await uiMessenger.delegate({
          actions: ['SnapController:installSnaps'],
          messenger: delegatee,
        });
        await uiMessenger.revoke({
          actions: ['SnapController:installSnaps'],
          messenger: delegatee,
        });

        expect(() =>
          delegatee.call('SnapController:installSnaps', 'metamask', {}),
        ).toThrow();
      });

      it('silently ignores actions that have not been delegated', async () => {
        const delegatee = createDelegatee();

        await expect(
          uiMessenger.revoke({
            actions: ['SnapController:installSnaps'],
            messenger: delegatee,
          }),
        ).resolves.not.toThrow();
      });

      it('allows re-delegation after revoking', async () => {
        const delegatee = createDelegatee();

        await uiMessenger.delegate({
          actions: ['SnapController:installSnaps'],
          messenger: delegatee,
        });
        await uiMessenger.revoke({
          actions: ['SnapController:installSnaps'],
          messenger: delegatee,
        });

        await expect(
          uiMessenger.delegate({
            actions: ['SnapController:installSnaps'],
            messenger: delegatee,
          }),
        ).resolves.not.toThrow();
      });
    });

    describe('events', () => {
      it('calls Engine.controllerMessenger.unsubscribe for the event', async () => {
        const delegatee = createDelegatee();

        await uiMessenger.delegate({
          events: ['SnapController:snapInstalled'],
          messenger: delegatee,
        });
        await uiMessenger.revoke({
          events: ['SnapController:snapInstalled'],
          messenger: delegatee,
        });

        expect(mockUnsubscribe).toHaveBeenCalledWith(
          'SnapController:snapInstalled',
          expect.any(Function),
        );
      });

      it('allows re-delegation after revoking', async () => {
        const delegatee = createDelegatee();

        await uiMessenger.delegate({
          events: ['SnapController:snapInstalled'],
          messenger: delegatee,
        });
        await uiMessenger.revoke({
          events: ['SnapController:snapInstalled'],
          messenger: delegatee,
        });

        await expect(
          uiMessenger.delegate({
            events: ['SnapController:snapInstalled'],
            messenger: delegatee,
          }),
        ).resolves.not.toThrow();
      });

      it('silently ignores events that have not been delegated', async () => {
        const delegatee = createDelegatee();

        await expect(
          uiMessenger.revoke({
            events: ['SnapController:snapInstalled'],
            messenger: delegatee,
          }),
        ).resolves.not.toThrow();
      });
    });
  });
});
