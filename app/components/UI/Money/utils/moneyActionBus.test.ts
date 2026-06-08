import {
  requestMoneyAction,
  setMoneyActionListener,
  type MoneyAction,
} from './moneyActionBus';
import Logger from '../../../../util/Logger';

jest.mock('../../../../util/Logger', () => ({ log: jest.fn() }));

describe('moneyActionBus', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('delivers a requested action to the registered listener', () => {
    const listener = jest.fn();
    const unsubscribe = setMoneyActionListener(listener);

    const action: MoneyAction = {
      type: 'deposit',
      options: { autoSelectFiatPayment: true },
    };
    requestMoneyAction(action);

    expect(listener).toHaveBeenCalledWith(action);
    unsubscribe();
  });

  it('drops the action and logs when no listener is registered', () => {
    requestMoneyAction({ type: 'withdrawal' });

    expect(Logger.log).toHaveBeenCalledWith(
      expect.stringContaining('no executor mounted'),
      'withdrawal',
    );
  });

  it('stops delivering after unsubscribe', () => {
    const listener = jest.fn();
    setMoneyActionListener(listener)();

    requestMoneyAction({ type: 'withdrawal' });

    expect(listener).not.toHaveBeenCalled();
  });

  it('only keeps the latest listener (single executor)', () => {
    const first = jest.fn();
    const second = jest.fn();
    setMoneyActionListener(first);
    const unsubscribeSecond = setMoneyActionListener(second);

    requestMoneyAction({ type: 'withdrawal' });

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
    unsubscribeSecond();
  });

  it('unsubscribe from a superseded listener does not clear the active one', () => {
    const first = jest.fn();
    const second = jest.fn();
    const unsubscribeFirst = setMoneyActionListener(first);
    setMoneyActionListener(second);

    // The stale unsubscribe must be a no-op, not detach the newer listener.
    unsubscribeFirst();
    requestMoneyAction({ type: 'withdrawal' });

    expect(second).toHaveBeenCalledTimes(1);
  });
});
