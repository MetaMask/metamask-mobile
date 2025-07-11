import { Messenger, RestrictedMessenger } from '@metamask/base-controller';
import {
  getDeFiPositionsControllerInitMessenger,
  getDeFiPositionsControllerMessenger,
} from './defi-positions-controller-messenger';

describe('getDeFiPositionsControllerMessenger', () => {
  it('returns a restricted messenger', () => {
    const controllerMessenger = new Messenger<never, never>();
    const defiPositionsControllerMessenger =
      getDeFiPositionsControllerMessenger(controllerMessenger);

    expect(defiPositionsControllerMessenger).toBeInstanceOf(
      RestrictedMessenger,
    );
  });
});

describe('getDeFiPositionsControllerInitMessenger', () => {
  it('returns a restricted messenger', () => {
    const controllerMessenger = new Messenger<never, never>();
    const defiPositionsControllerInitMessenger =
      getDeFiPositionsControllerInitMessenger(controllerMessenger);

    expect(defiPositionsControllerInitMessenger).toBeInstanceOf(
      RestrictedMessenger,
    );
  });
});
