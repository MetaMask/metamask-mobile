import { act } from '@testing-library/react-hooks';
import { renderHookWithProvider } from '../../../test/renderWithProvider';
// eslint-disable-next-line import/no-namespace
import * as actions from '../../../../actions/identity';
import { useSignIn } from './useSignIn';

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

  const mockPerformSignInAction = jest.spyOn(actions, 'performSignIn');

  return {
    state,
    mockPerformSignInAction,
  };
};

describe('useSignIn', () => {
  it('should initialize correctly', () => {
    const { state } = arrangeMocks({
      isSignedIn: false,
    });
    const hook = renderHookWithProvider(() => useSignIn(), { state });

    expect(hook.result.current.signIn).toBeDefined();
  });

  it('should call performSignIn if a user is not already signed in', async () => {
    const { state, mockPerformSignInAction } = arrangeMocks({
      isSignedIn: false,
    });
    const hook = renderHookWithProvider(() => useSignIn(), { state });

    await act(async () => {
      await hook.result.current.signIn();
    });

    expect(mockPerformSignInAction).toHaveBeenCalled();
  });

  it('should not call performSignIn if a user is already signed in', async () => {
    const { state, mockPerformSignInAction } = arrangeMocks({
      isSignedIn: true,
    });
    const hook = renderHookWithProvider(() => useSignIn(), { state });

    await act(async () => {
      await hook.result.current.signIn();
    });

    expect(mockPerformSignInAction).not.toHaveBeenCalled();
  });
});
