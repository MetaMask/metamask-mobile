import { renderHookWithProvider } from '../../../test/renderWithProvider';
import { useAutoSignIn, useAutoSignOut } from '../useAuthentication';
import { useAccountSyncing } from '../useAccountSyncing';
import { useIdentityEffects } from './useIdentityEffects';

jest.mock('../useAuthentication');
jest.mock('../useAccountSyncing');

describe('useIdentityEffects', () => {
  const mockUseAutoSignIn = jest.mocked(useAutoSignIn);
  const mockUseAutoSignOut = jest.mocked(useAutoSignOut);
  const mockUseAccountSyncing = jest.mocked(useAccountSyncing);

  beforeEach(() => {
    mockUseAutoSignIn.mockReturnValue({
      autoSignIn: jest.fn(),
      shouldAutoSignIn: false,
    });

    mockUseAutoSignOut.mockReturnValue({
      autoSignOut: jest.fn(),
      shouldAutoSignOut: false,
    });

    mockUseAccountSyncing.mockReturnValue({
      dispatchAccountSyncing: jest.fn(),
      shouldDispatchAccountSyncing: false,
    });
  });

  it('calls autoSignIn if shouldAutoSignIn returns true', () => {
    const autoSignIn = jest.fn();
    const shouldAutoSignIn = true;
    mockUseAutoSignIn.mockReturnValue({
      autoSignIn,
      shouldAutoSignIn,
    });

    renderHookWithProvider(() => useIdentityEffects());

    expect(autoSignIn).toHaveBeenCalled();
  });

  it('does not call autoSignIn if shouldAutoSignIn returns false', () => {
    const autoSignIn = jest.fn();
    const shouldAutoSignIn = false;
    mockUseAutoSignIn.mockReturnValue({
      autoSignIn,
      shouldAutoSignIn,
    });

    renderHookWithProvider(() => useIdentityEffects());

    expect(autoSignIn).not.toHaveBeenCalled();
  });

  it('calls autoSignOut if shouldAutoSignOut returns true', () => {
    const autoSignOut = jest.fn();
    const shouldAutoSignOut = true;
    mockUseAutoSignOut.mockReturnValue({
      autoSignOut,
      shouldAutoSignOut,
    });

    renderHookWithProvider(() => useIdentityEffects());

    expect(autoSignOut).toHaveBeenCalled();
  });

  it('does not call autoSignOut if shouldAutoSignOut returns false', () => {
    const autoSignOut = jest.fn();
    const shouldAutoSignOut = false;
    mockUseAutoSignOut.mockReturnValue({
      autoSignOut,
      shouldAutoSignOut,
    });

    renderHookWithProvider(() => useIdentityEffects());

    expect(autoSignOut).not.toHaveBeenCalled();
  });

  it('dispatches account syncing if shouldDispatchAccountSyncing returns true', () => {
    const dispatchAccountSyncing = jest.fn();
    const shouldDispatchAccountSyncing = true;
    mockUseAccountSyncing.mockReturnValue({
      dispatchAccountSyncing,
      shouldDispatchAccountSyncing,
    });

    renderHookWithProvider(() => useIdentityEffects());

    expect(dispatchAccountSyncing).toHaveBeenCalled();
  });

  it('does not dispatch account syncing if shouldDispatchAccountSyncing returns false', () => {
    const dispatchAccountSyncing = jest.fn();
    const shouldDispatchAccountSyncing = false;
    mockUseAccountSyncing.mockReturnValue({
      dispatchAccountSyncing,
      shouldDispatchAccountSyncing,
    });

    renderHookWithProvider(() => useIdentityEffects());

    expect(dispatchAccountSyncing).not.toHaveBeenCalled();
  });
});
