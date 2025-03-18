import { act } from '@testing-library/react-hooks';
import { renderHookWithProvider } from '../../../test/renderWithProvider';
// eslint-disable-next-line import/no-namespace
import * as actions from '../../../../actions/identity';
import { useSignOut } from './useSignOut';

interface ArrangeMocksMetamaskStateOverrides {
  isSignedIn: boolean;
}

const arrangeMockState = (
  stateOverrides: ArrangeMocksMetamaskStateOverrides,
) => ({
  engine: {
    backgroundState: {
      AuthenticationController: {
        isSignedIn: stateOverrides.isSignedIn,
      },
    },
  },
});

const arrangeMocks = (stateOverrides: ArrangeMocksMetamaskStateOverrides) => {
  jest.clearAllMocks();
  const state = arrangeMockState(stateOverrides);

  const mockPerformSignOutAction = jest.spyOn(actions, 'performSignOut');

  return {
    state,
    mockPerformSignOutAction,
  };
};

describe('useSignOut', () => {
  it('should initialize correctly', () => {
    const { state } = arrangeMocks({
      isSignedIn: true,
    });
    const hook = renderHookWithProvider(() => useSignOut(), { state });

    expect(hook.result.current.signOut).toBeDefined();
  });

  it('should call performSignOut if the user is signed in', async () => {
    const { state, mockPerformSignOutAction } = arrangeMocks({
      isSignedIn: true,
    });
    const hook = renderHookWithProvider(() => useSignOut(), { state });

    await act(async () => {
      await hook.result.current.signOut();
    });

    expect(mockPerformSignOutAction).toHaveBeenCalled();
  });

  it('should not call performSignOut if the user is already signed out', async () => {
    const { state, mockPerformSignOutAction } = arrangeMocks({
      isSignedIn: false,
    });
    const hook = renderHookWithProvider(() => useSignOut(), { state });

    await act(async () => {
      await hook.result.current.signOut();
    });

    expect(mockPerformSignOutAction).not.toHaveBeenCalled();
  });
});
