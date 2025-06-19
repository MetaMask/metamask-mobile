import { renderHookWithProvider } from '../../../test/renderWithProvider';
import { useAutoSignIn, useAutoSignOut } from '../useAuthentication';
import { useAccountSyncing } from '../useAccountSyncing';
import { useContactSyncing } from '../useContactSyncing';
import { useIdentityEffects } from './useIdentityEffects';

jest.mock('../useAuthentication');
jest.mock('../useAccountSyncing');
jest.mock('../useContactSyncing');

describe('useIdentityEffects', () => {
  const mockUseAutoSignIn = jest.mocked(useAutoSignIn);
  const mockUseAutoSignOut = jest.mocked(useAutoSignOut);
  const mockUseAccountSyncing = jest.mocked(useAccountSyncing);
  const mockUseContactSyncing = jest.mocked(useContactSyncing);

  beforeEach(() => {
    mockUseAutoSignIn.mockReturnValue({
      autoSignIn: jest.fn(),
      shouldAutoSignIn: false,
      setHasNewKeyrings: jest.fn(),
    });

    mockUseAutoSignOut.mockReturnValue({
      autoSignOut: jest.fn(),
      shouldAutoSignOut: false,
    });

    mockUseAccountSyncing.mockReturnValue({
      dispatchAccountSyncing: jest.fn(),
      shouldDispatchAccountSyncing: false,
    });

    mockUseContactSyncing.mockReturnValue({
      dispatchContactSyncing: jest.fn(),
      shouldDispatchContactSyncing: false,
    });
  });

  it('calls autoSignIn if shouldAutoSignIn returns true', () => {
    const autoSignIn = jest.fn();
    const shouldAutoSignIn = true;
    mockUseAutoSignIn.mockReturnValue({
      autoSignIn,
      shouldAutoSignIn,
      setHasNewKeyrings: jest.fn(),
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
      setHasNewKeyrings: jest.fn(),
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

  it('dispatches contact syncing if shouldDispatchContactSyncing returns true', () => {
    const dispatchContactSyncing = jest.fn();
    const shouldDispatchContactSyncing = true;
    mockUseContactSyncing.mockReturnValue({
      dispatchContactSyncing,
      shouldDispatchContactSyncing,
    });

    renderHookWithProvider(() => useIdentityEffects());

    expect(dispatchContactSyncing).toHaveBeenCalled();
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

  it('does not dispatch contact syncing if shouldDispatchContactSyncing returns false', () => {
    const dispatchContactSyncing = jest.fn();
    const shouldDispatchContactSyncing = false;
    mockUseContactSyncing.mockReturnValue({
      dispatchContactSyncing,
      shouldDispatchContactSyncing,
    });

    renderHookWithProvider(() => useIdentityEffects());

    expect(dispatchContactSyncing).not.toHaveBeenCalled();
  });
});
