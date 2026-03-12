import { act, renderHook } from '@testing-library/react-hooks';
import { useTrustSignalGateControl } from './useTrustSignalGate';
import { AccountConnectScreens } from '../AccountConnect.types';

describe('useTrustSignalGateControl', () => {
  it('transitions to TrustSignalWarning from SingleConnect', () => {
    const setScreen = jest.fn();

    renderHook(
      ({ needsTrustSignalGate }) =>
        useTrustSignalGateControl(needsTrustSignalGate, setScreen),
      { initialProps: { needsTrustSignalGate: true } },
    );

    expect(setScreen).toHaveBeenCalledTimes(1);
    const updater = setScreen.mock.calls[0][0];
    expect(updater(AccountConnectScreens.SingleConnect)).toBe(
      AccountConnectScreens.TrustSignalWarning,
    );
  });

  it('transitions to TrustSignalWarning from SingleConnectSelector (race-condition fix)', () => {
    const setScreen = jest.fn();

    renderHook(
      ({ needsTrustSignalGate }) =>
        useTrustSignalGateControl(needsTrustSignalGate, setScreen),
      { initialProps: { needsTrustSignalGate: true } },
    );

    const updater = setScreen.mock.calls[0][0];
    expect(updater(AccountConnectScreens.SingleConnectSelector)).toBe(
      AccountConnectScreens.TrustSignalWarning,
    );
  });

  it('transitions to TrustSignalWarning from MultiConnectSelector (race-condition fix)', () => {
    const setScreen = jest.fn();

    renderHook(
      ({ needsTrustSignalGate }) =>
        useTrustSignalGateControl(needsTrustSignalGate, setScreen),
      { initialProps: { needsTrustSignalGate: true } },
    );

    const updater = setScreen.mock.calls[0][0];
    expect(updater(AccountConnectScreens.MultiConnectSelector)).toBe(
      AccountConnectScreens.TrustSignalWarning,
    );
  });

  it('transitions to TrustSignalWarning from AddNewAccount (race-condition fix)', () => {
    const setScreen = jest.fn();

    renderHook(
      ({ needsTrustSignalGate }) =>
        useTrustSignalGateControl(needsTrustSignalGate, setScreen),
      { initialProps: { needsTrustSignalGate: true } },
    );

    const updater = setScreen.mock.calls[0][0];
    expect(updater(AccountConnectScreens.AddNewAccount)).toBe(
      AccountConnectScreens.TrustSignalWarning,
    );
  });

  it('does not interrupt MaliciousWarning screen', () => {
    const setScreen = jest.fn();

    renderHook(
      ({ needsTrustSignalGate }) =>
        useTrustSignalGateControl(needsTrustSignalGate, setScreen),
      { initialProps: { needsTrustSignalGate: true } },
    );

    const updater = setScreen.mock.calls[0][0];
    expect(updater(AccountConnectScreens.MaliciousWarning)).toBe(
      AccountConnectScreens.MaliciousWarning,
    );
  });

  it('is a no-op when already on TrustSignalWarning', () => {
    const setScreen = jest.fn();

    renderHook(
      ({ needsTrustSignalGate }) =>
        useTrustSignalGateControl(needsTrustSignalGate, setScreen),
      { initialProps: { needsTrustSignalGate: true } },
    );

    const updater = setScreen.mock.calls[0][0];
    expect(updater(AccountConnectScreens.TrustSignalWarning)).toBe(
      AccountConnectScreens.TrustSignalWarning,
    );
  });

  it('does not fire when needsTrustSignalGate is false', () => {
    const setScreen = jest.fn();

    renderHook(
      ({ needsTrustSignalGate }) =>
        useTrustSignalGateControl(needsTrustSignalGate, setScreen),
      { initialProps: { needsTrustSignalGate: false } },
    );

    expect(setScreen).not.toHaveBeenCalled();
  });

  it('does not fire again after the gate has been dismissed', () => {
    const setScreen = jest.fn();

    const { result, rerender } = renderHook(
      ({ needsTrustSignalGate }) =>
        useTrustSignalGateControl(needsTrustSignalGate, setScreen),
      { initialProps: { needsTrustSignalGate: true } },
    );

    // Dismiss the gate
    act(() => {
      result.current.handleTrustSignalDismiss();
    });

    setScreen.mockClear();

    // Re-trigger the effect (e.g., needsTrustSignalGate flickers false→true)
    rerender({ needsTrustSignalGate: false });
    rerender({ needsTrustSignalGate: true });

    expect(setScreen).not.toHaveBeenCalled();
  });

  it('handleTrustSignalDismiss navigates to SingleConnect', () => {
    const setScreen = jest.fn();

    const { result } = renderHook(
      ({ needsTrustSignalGate }) =>
        useTrustSignalGateControl(needsTrustSignalGate, setScreen),
      { initialProps: { needsTrustSignalGate: true } },
    );

    setScreen.mockClear();

    act(() => {
      result.current.handleTrustSignalDismiss();
    });

    expect(setScreen).toHaveBeenCalledWith(AccountConnectScreens.SingleConnect);
  });
});
