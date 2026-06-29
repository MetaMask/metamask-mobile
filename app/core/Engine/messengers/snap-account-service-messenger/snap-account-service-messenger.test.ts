import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import type { SnapAccountServiceMessenger } from '@metamask/snap-account-service';
import { getSnapAccountServiceMessenger } from './snap-account-service-messenger';

type RootMessenger = Messenger<
  MockAnyNamespace,
  MessengerActions<SnapAccountServiceMessenger>,
  MessengerEvents<SnapAccountServiceMessenger>
>;

function getRootMessenger(): RootMessenger {
  return new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  });
}

describe('getSnapAccountServiceMessenger', () => {
  it('returns a messenger', () => {
    const rootMessenger = getRootMessenger();
    const snapAccountServiceMessenger =
      getSnapAccountServiceMessenger(rootMessenger);

    expect(snapAccountServiceMessenger).toBeInstanceOf(Messenger);
  });

  it('delegates the KeyringController actions to the scoped messenger', () => {
    const rootMessenger = getRootMessenger();
    const delegateSpy = jest.spyOn(rootMessenger, 'delegate');

    getSnapAccountServiceMessenger(rootMessenger);

    expect(delegateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        actions: expect.arrayContaining([
          'KeyringController:withController',
          'KeyringController:getState',
          'KeyringController:withKeyringV2Unsafe',
        ]),
      }),
    );
  });

  it('delegates the SnapController actions to the scoped messenger', () => {
    const rootMessenger = getRootMessenger();
    const delegateSpy = jest.spyOn(rootMessenger, 'delegate');

    getSnapAccountServiceMessenger(rootMessenger);

    expect(delegateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        actions: expect.arrayContaining([
          'SnapController:getState',
          'SnapController:getSnap',
          'SnapController:getRunnableSnaps',
        ]),
      }),
    );
  });

  it('delegates the AccountTreeController actions to the scoped messenger', () => {
    const rootMessenger = getRootMessenger();
    const delegateSpy = jest.spyOn(rootMessenger, 'delegate');

    getSnapAccountServiceMessenger(rootMessenger);

    expect(delegateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        actions: expect.arrayContaining([
          'AccountTreeController:getAccountGroupObject',
          'AccountTreeController:getSelectedAccountGroup',
        ]),
      }),
    );
  });

  it('delegates the KeyringController events to the scoped messenger', () => {
    const rootMessenger = getRootMessenger();
    const delegateSpy = jest.spyOn(rootMessenger, 'delegate');

    getSnapAccountServiceMessenger(rootMessenger);

    expect(delegateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        events: expect.arrayContaining([
          'KeyringController:stateChange',
          'KeyringController:unlock',
        ]),
      }),
    );
  });

  it('delegates the SnapController events to the scoped messenger', () => {
    const rootMessenger = getRootMessenger();
    const delegateSpy = jest.spyOn(rootMessenger, 'delegate');

    getSnapAccountServiceMessenger(rootMessenger);

    expect(delegateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        events: expect.arrayContaining([
          'SnapController:stateChange',
          'SnapController:snapInstalled',
          'SnapController:snapEnabled',
          'SnapController:snapDisabled',
          'SnapController:snapBlocked',
          'SnapController:snapUnblocked',
          'SnapController:snapUninstalled',
        ]),
      }),
    );
  });

  it('delegates the AccountTreeController events to the scoped messenger', () => {
    const rootMessenger = getRootMessenger();
    const delegateSpy = jest.spyOn(rootMessenger, 'delegate');

    getSnapAccountServiceMessenger(rootMessenger);

    expect(delegateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        events: expect.arrayContaining([
          'AccountTreeController:selectedAccountGroupChange',
          'AccountTreeController:accountGroupCreated',
          'AccountTreeController:accountGroupUpdated',
          'AccountTreeController:accountGroupRemoved',
        ]),
      }),
    );
  });
});
