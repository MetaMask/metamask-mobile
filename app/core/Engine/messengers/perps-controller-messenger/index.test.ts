import type { InternalAccount } from '@metamask/keyring-internal-api';
import { getPerpsControllerMessenger } from '.';
import { ExtendedMessenger } from '../../../ExtendedMessenger';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';

interface GetSelectedAccountAction {
  type: 'AccountsController:getSelectedAccount';
  handler: () => InternalAccount;
}

describe('PerpsController Messenger', () => {
  const selectedAccount: InternalAccount = {
    id: 'selected-account-id',
    address: '0x1111111111111111111111111111111111111111',
    type: 'eip155:eoa' as const,
    options: {},
    methods: [],
    metadata: {
      name: 'Selected Account',
      importTime: Date.now(),
      keyring: {
        type: 'HD Key Tree',
      },
    },
    scopes: ['eip155:1'],
  };

  it('returns an instance of the perps controller messenger', () => {
    const baseControllerMessenger = new ExtendedMessenger<MockAnyNamespace>({
      namespace: MOCK_ANY_NAMESPACE,
    });

    const result = getPerpsControllerMessenger(baseControllerMessenger);

    const expectedMethods = [
      'call',
      'clearEventSubscriptions',
      'publish',
      'registerActionHandler',
      'registerInitialEventPayload',
      'subscribe',
      'unregisterActionHandler',
      'unsubscribe',
    ] as const;

    expectedMethods.forEach((method) => {
      expect(typeof result[method]).toBe('function');
    });
  });

  it('delegates the selected account action to the perps controller messenger', () => {
    const baseControllerMessenger = new ExtendedMessenger<
      MockAnyNamespace,
      GetSelectedAccountAction
    >({
      namespace: MOCK_ANY_NAMESPACE,
    });
    baseControllerMessenger.registerActionHandler(
      'AccountsController:getSelectedAccount',
      () => selectedAccount,
    );

    const result = getPerpsControllerMessenger(baseControllerMessenger);

    expect(result.call('AccountsController:getSelectedAccount')).toBe(
      selectedAccount,
    );
  });

  it('delegates required events to the perps controller messenger', () => {
    const baseControllerMessenger = new ExtendedMessenger<MockAnyNamespace>({
      namespace: MOCK_ANY_NAMESPACE,
    });
    const delegateSpy = jest.spyOn(baseControllerMessenger, 'delegate');

    getPerpsControllerMessenger(baseControllerMessenger);

    expect(delegateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        events: expect.arrayContaining([
          'RemoteFeatureFlagController:stateChange',
          'AccountsController:selectedAccountChange',
          'AccountTreeController:selectedAccountGroupChange',
        ]),
      }),
    );
  });
});
