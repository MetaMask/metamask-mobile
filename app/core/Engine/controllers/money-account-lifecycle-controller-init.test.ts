import { MoneyAccountLifecycleController } from '@metamask/money-account-lifecycle-controller';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';
import { ExtendedMessenger } from '../../ExtendedMessenger';
import { buildMessengerClientInitRequestMock } from '../utils/test-utils';
import { getMoneyAccountLifecycleControllerMessenger } from '../messengers/money-account-lifecycle-controller-messenger';
import { moneyAccountLifecycleControllerInit } from './money-account-lifecycle-controller-init';
import { isMoneyAccountEnabled } from '../../../lib/Money/feature-flags';

jest.mock('@metamask/money-account-lifecycle-controller');

function getInitRequestMock() {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  return buildMessengerClientInitRequestMock(
    getMoneyAccountLifecycleControllerMessenger(
      baseMessenger,
    ) as unknown as Parameters<typeof buildMessengerClientInitRequestMock>[0],
  );
}

describe('moneyAccountLifecycleControllerInit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('constructs the controller gated on the Money Account flag', () => {
    const initRequest = getInitRequestMock();

    const { controller } = moneyAccountLifecycleControllerInit(initRequest);

    expect(controller).toBeInstanceOf(MoneyAccountLifecycleController);
    expect(MoneyAccountLifecycleController).toHaveBeenCalledWith({
      messenger: initRequest.controllerMessenger,
      state: initRequest.persistedState.MoneyAccountLifecycleController,
      hooks: { isEnabled: isMoneyAccountEnabled },
    });
  });

  it('initializes the controller', () => {
    const { controller } =
      moneyAccountLifecycleControllerInit(getInitRequestMock());

    expect(controller.init).toHaveBeenCalledTimes(1);
  });
});
