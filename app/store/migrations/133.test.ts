import { cloneDeep } from 'lodash';

import migrate from './133';
import { ensureValidState, ValidState } from './util';

jest.mock('./util', () => ({
  ensureValidState: jest.fn(),
}));

describe('migration 133', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.mocked(ensureValidState).mockReturnValue(true);
  });

  it('does not modify the state if `ensureValidState` returns `false`', () => {
    const state = { some: 'state' };
    jest.mocked(ensureValidState).mockReturnValueOnce(false);

    const result = migrate(state);

    expect(result).toBe(state);
  });

  it('resets isSignedIn from true to false', () => {
    const state = {
      engine: {
        backgroundState: {
          AuthenticationController: {
            isSignedIn: true,
            srpSessionData: { 'srp-1': { token: 'cached-token' } },
          },
        },
      },
    };

    const result = migrate(cloneDeep(state)) as ValidState;

    expect(
      result.engine.backgroundState.AuthenticationController,
    ).toStrictEqual({
      isSignedIn: false,
      srpSessionData: { 'srp-1': { token: 'cached-token' } },
    });
  });

  it('preserves srpSessionData untouched', () => {
    const srpSessionData = {
      'srp-1': { token: 'token-1', profile: { profileId: 'p1' } },
      'srp-2': { token: 'token-2', profile: { profileId: 'p2' } },
    };
    const state = {
      engine: {
        backgroundState: {
          AuthenticationController: {
            isSignedIn: true,
            srpSessionData,
          },
        },
      },
    };

    const result = migrate(cloneDeep(state)) as ValidState;

    expect(
      result.engine.backgroundState.AuthenticationController.srpSessionData,
    ).toStrictEqual(srpSessionData);
  });

  it('does nothing when AuthenticationController is missing', () => {
    const state = {
      engine: {
        backgroundState: {
          SomeOtherController: {},
        },
      },
    };

    const result = migrate(cloneDeep(state)) as ValidState;

    expect(result.engine.backgroundState).toStrictEqual(
      state.engine.backgroundState,
    );
  });

  it('does nothing when AuthenticationController is not an object', () => {
    const state = {
      engine: {
        backgroundState: {
          AuthenticationController: 'invalid',
        },
      },
    };

    const result = migrate(cloneDeep(state)) as ValidState;

    expect(result.engine.backgroundState).toStrictEqual(
      state.engine.backgroundState,
    );
  });

  it('does nothing when isSignedIn is already false', () => {
    const state = {
      engine: {
        backgroundState: {
          AuthenticationController: {
            isSignedIn: false,
            srpSessionData: {},
          },
        },
      },
    };

    const result = migrate(cloneDeep(state)) as ValidState;

    expect(
      result.engine.backgroundState.AuthenticationController,
    ).toStrictEqual(state.engine.backgroundState.AuthenticationController);
  });

  it('does nothing when isSignedIn property is missing', () => {
    const state = {
      engine: {
        backgroundState: {
          AuthenticationController: {
            srpSessionData: {},
          },
        },
      },
    };

    const result = migrate(cloneDeep(state)) as ValidState;

    expect(
      result.engine.backgroundState.AuthenticationController,
    ).toStrictEqual(state.engine.backgroundState.AuthenticationController);
  });
});
