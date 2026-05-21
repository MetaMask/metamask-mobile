import { renderHook } from '@testing-library/react-native';
// eslint-disable-next-line import-x/no-namespace
import * as KeyringSelectors from '../../../selectors/keyringController';
// eslint-disable-next-line import-x/no-namespace
import * as SettingsSelectors from '../../../selectors/settings';
// eslint-disable-next-line import-x/no-namespace
import * as IdentitySelectors from '../../../selectors/identity';
// eslint-disable-next-line import-x/no-namespace
import * as Constants from '../constants/config';
import { useNotificationsRuntimeGate } from './useNotificationsRuntimeGate';
import { renderHookWithProvider } from '../../test/renderWithProvider';

const arrangeSelectors = ({
  isUnlocked = true,
  isSignedIn = true,
  isBasicFunctionalityEnabled = true,
  notificationsFlagEnabled = true,
}: {
  isUnlocked?: boolean;
  isSignedIn?: boolean;
  isBasicFunctionalityEnabled?: boolean;
  notificationsFlagEnabled?: boolean;
} = {}) => {
  jest.spyOn(KeyringSelectors, 'selectIsUnlocked').mockReturnValue(isUnlocked);
  jest.spyOn(IdentitySelectors, 'selectIsSignedIn').mockReturnValue(isSignedIn);
  jest
    .spyOn(SettingsSelectors, 'selectBasicFunctionalityEnabled')
    .mockReturnValue(isBasicFunctionalityEnabled);
  jest
    .spyOn(Constants, 'isNotificationsFeatureEnabled')
    .mockReturnValue(notificationsFlagEnabled);
};

describe('useNotificationsRuntimeGate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    arrangeSelectors();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns true when all four conditions are met', () => {
    const { result } = renderHookWithProvider(() =>
      useNotificationsRuntimeGate(),
    );

    expect(result.current).toBe(true);
  });

  it('returns false when wallet is locked', () => {
    arrangeSelectors({ isUnlocked: false });

    const { result } = renderHookWithProvider(() =>
      useNotificationsRuntimeGate(),
    );

    expect(result.current).toBe(false);
  });

  it('returns false when user is not signed in', () => {
    arrangeSelectors({ isSignedIn: false });

    const { result } = renderHookWithProvider(() =>
      useNotificationsRuntimeGate(),
    );

    expect(result.current).toBe(false);
  });

  it('returns false when basic functionality is disabled', () => {
    arrangeSelectors({ isBasicFunctionalityEnabled: false });

    const { result } = renderHookWithProvider(() =>
      useNotificationsRuntimeGate(),
    );

    expect(result.current).toBe(false);
  });

  it('returns false when the notifications feature flag is off', () => {
    arrangeSelectors({ notificationsFlagEnabled: false });

    const { result } = renderHookWithProvider(() =>
      useNotificationsRuntimeGate(),
    );

    expect(result.current).toBe(false);
  });

  it('returns false when multiple conditions fail', () => {
    arrangeSelectors({ isUnlocked: false, isSignedIn: false });

    const { result } = renderHookWithProvider(() =>
      useNotificationsRuntimeGate(),
    );

    expect(result.current).toBe(false);
  });
});
