import { act } from '@testing-library/react-hooks';
import { renderHookWithProvider } from '../../../test/renderWithProvider';
// eslint-disable-next-line import/no-namespace
import * as actions from '../../../../actions/onboarding';
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

  return {
    state,
    mockSetCompletedOnboarding,
  };
};

describe('useCompletedOnboardingEffect', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('completes onboarding when vault exists but onboarding incomplete', async () => {
    // Arrange
    const { state, mockSetCompletedOnboarding } = arrangeMocks({
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
  });

  it('skips onboarding completion when vault is missing', async () => {
    // Arrange
    const { state, mockSetCompletedOnboarding } = arrangeMocks({
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
  });

  it('skips onboarding completion when already completed', async () => {
    // Arrange
    const { state, mockSetCompletedOnboarding } = arrangeMocks({
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
  });

  it('skips onboarding completion when vault missing with completed status', async () => {
    // Arrange
    const { state, mockSetCompletedOnboarding } = arrangeMocks({
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
  });
});
