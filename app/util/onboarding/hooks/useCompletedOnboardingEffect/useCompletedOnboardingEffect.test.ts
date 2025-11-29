import { act } from '@testing-library/react-hooks';
import { renderHookWithProvider } from '../../../test/renderWithProvider';
// eslint-disable-next-line import/no-namespace
import * as actions from '../../../../actions/onboarding';
// eslint-disable-next-line import/no-namespace
import * as userActions from '../../../../actions/user';
import { useCompletedOnboardingEffect } from './useCompletedOnboardingEffect';

interface ArrangeMocksMetamaskStateOverrides {
  vault?: string;
  completedOnboarding: boolean;
}

const arrangeMockState = (
  stateOverrides: ArrangeMocksMetamaskStateOverrides,
) => ({
  engine: {
    backgroundState: {
      KeyringController: {
        vault: stateOverrides.vault,
      },
    },
  },
  onboarding: {
    completedOnboarding: stateOverrides.completedOnboarding,
  },
});

const arrangeMocks = (stateOverrides: ArrangeMocksMetamaskStateOverrides) => {
  const state = arrangeMockState(stateOverrides);

  const mockSetCompletedOnboarding = jest.spyOn(
    actions,
    'setCompletedOnboarding',
  );

  const mockCheckForDeeplink = jest.spyOn(userActions, 'checkForDeeplink');

  return {
    state,
    mockSetCompletedOnboarding,
    mockCheckForDeeplink,
  };
};

describe('useCompletedOnboardingEffect', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('sets completedOnboarding to true and dispatches checkForDeeplink when vault exists and onboarding not completed', async () => {
    // Arrange
    const { state, mockSetCompletedOnboarding, mockCheckForDeeplink } =
      arrangeMocks({
        vault: 'mock-vault-data',
        completedOnboarding: false,
      });

    // Act
    const { rerender } = renderHookWithProvider(
      () => useCompletedOnboardingEffect(),
      { state },
    );
    await act(async () => {
      rerender({});
    });

    // Assert
    expect(mockSetCompletedOnboarding).toHaveBeenCalledWith(true);
    expect(mockCheckForDeeplink).toHaveBeenCalled();
  });

  it('does not dispatch actions when vault is empty', async () => {
    // Arrange
    const { state, mockSetCompletedOnboarding, mockCheckForDeeplink } =
      arrangeMocks({
        vault: undefined,
        completedOnboarding: false,
      });

    // Act
    const { rerender } = renderHookWithProvider(
      () => useCompletedOnboardingEffect(),
      { state },
    );
    await act(async () => {
      rerender({});
    });

    // Assert
    expect(mockSetCompletedOnboarding).not.toHaveBeenCalled();
    expect(mockCheckForDeeplink).not.toHaveBeenCalled();
  });

  it('does not dispatch actions when onboarding already completed', async () => {
    // Arrange
    const { state, mockSetCompletedOnboarding, mockCheckForDeeplink } =
      arrangeMocks({
        vault: 'mock-vault-data',
        completedOnboarding: true,
      });

    // Act
    const { rerender } = renderHookWithProvider(
      () => useCompletedOnboardingEffect(),
      { state },
    );
    await act(async () => {
      rerender({});
    });

    // Assert
    expect(mockSetCompletedOnboarding).not.toHaveBeenCalled();
    expect(mockCheckForDeeplink).not.toHaveBeenCalled();
  });

  it('does not dispatch actions when vault is empty and onboarding already completed', async () => {
    // Arrange
    const { state, mockSetCompletedOnboarding, mockCheckForDeeplink } =
      arrangeMocks({
        vault: undefined,
        completedOnboarding: true,
      });

    // Act
    const { rerender } = renderHookWithProvider(
      () => useCompletedOnboardingEffect(),
      { state },
    );
    await act(async () => {
      rerender({});
    });

    // Assert
    expect(mockSetCompletedOnboarding).not.toHaveBeenCalled();
    expect(mockCheckForDeeplink).not.toHaveBeenCalled();
  });
});
