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
  jest.clearAllMocks();
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
  it('sets completedOnboarding to true if conditions are met', async () => {
    const { state, mockSetCompletedOnboarding } = arrangeMocks({
      vault: 'mock-vault-data',
      completedOnboarding: false,
    });
    const { rerender } = renderHookWithProvider(
      () => useCompletedOnboardingEffect(),
      { state },
    );

    await act(async () => {
      rerender({});
    });

    expect(mockSetCompletedOnboarding).toHaveBeenCalledWith(true);
  });

  it('does not set completedOnboarding if vault is empty', async () => {
    const { state, mockSetCompletedOnboarding } = arrangeMocks({
      vault: undefined,
      completedOnboarding: false,
    });
    const { rerender } = renderHookWithProvider(
      () => useCompletedOnboardingEffect(),
      { state },
    );

    await act(async () => {
      rerender({});
    });

    expect(mockSetCompletedOnboarding).not.toHaveBeenCalled();
  });

  it('does not set completedOnboarding if it is already true', async () => {
    const { state, mockSetCompletedOnboarding } = arrangeMocks({
      vault: 'mock-vault-data',
      completedOnboarding: true,
    });
    const { rerender } = renderHookWithProvider(
      () => useCompletedOnboardingEffect(),
      { state },
    );

    await act(async () => {
      rerender({});
    });

    expect(mockSetCompletedOnboarding).not.toHaveBeenCalled();
  });

  it('does not set completedOnboarding if vault is undefined and completedOnboarding is true', async () => {
    const { state, mockSetCompletedOnboarding } = arrangeMocks({
      vault: undefined,
      completedOnboarding: true,
    });
    const { rerender } = renderHookWithProvider(
      () => useCompletedOnboardingEffect(),
      { state },
    );

    await act(async () => {
      rerender({});
    });

    expect(mockSetCompletedOnboarding).not.toHaveBeenCalled();
  });
});
