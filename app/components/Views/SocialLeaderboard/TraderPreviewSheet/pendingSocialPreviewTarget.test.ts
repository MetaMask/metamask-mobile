import { act, renderHook } from '@testing-library/react-native';
import {
  getPendingSocialPreviewTarget,
  setPendingSocialPreviewTarget,
  startPendingSocialPreviewOnboarding,
  takePendingSocialPreviewTarget,
  usePendingSocialPreviewTarget,
} from './pendingSocialPreviewTarget';

describe('pendingSocialPreviewTarget', () => {
  afterEach(() => {
    setPendingSocialPreviewTarget(null);
  });

  it('moves the target to onboarding with the accepted referral code', () => {
    setPendingSocialPreviewTarget({
      kind: 'trader',
      traderId: 'trader-1',
      stage: 'previewing',
    });

    startPendingSocialPreviewOnboarding('CODE1234');

    expect(getPendingSocialPreviewTarget()).toEqual({
      kind: 'trader',
      traderId: 'trader-1',
      stage: 'onboarding',
      referralCode: 'CODE1234',
    });
  });

  it('starts onboarding without a referral code when none was accepted', () => {
    setPendingSocialPreviewTarget({
      kind: 'position',
      traderId: 'trader-1',
      positionId: 'position-1',
      stage: 'previewing',
    });

    startPendingSocialPreviewOnboarding(undefined);

    expect(getPendingSocialPreviewTarget()).toEqual({
      kind: 'position',
      traderId: 'trader-1',
      positionId: 'position-1',
      stage: 'onboarding',
    });
  });

  it('does nothing when onboarding starts without a target', () => {
    startPendingSocialPreviewOnboarding('CODE1234');

    expect(getPendingSocialPreviewTarget()).toBeNull();
  });

  it('takes the target only in the requested stage', () => {
    setPendingSocialPreviewTarget({
      kind: 'trader',
      traderId: 'trader-1',
      stage: 'previewing',
    });

    const fromOnboarding = takePendingSocialPreviewTarget('onboarding');
    const fromPreviewing = takePendingSocialPreviewTarget('previewing');

    expect(fromOnboarding).toBeNull();
    expect(fromPreviewing).toEqual({
      kind: 'trader',
      traderId: 'trader-1',
      stage: 'previewing',
    });
    expect(getPendingSocialPreviewTarget()).toBeNull();
  });

  it('notifies subscribed components when the target changes', () => {
    const { result } = renderHook(() => usePendingSocialPreviewTarget());

    act(() => {
      setPendingSocialPreviewTarget({
        kind: 'trader',
        traderId: 'trader-1',
        stage: 'previewing',
      });
    });

    expect(result.current?.traderId).toBe('trader-1');

    act(() => {
      setPendingSocialPreviewTarget(null);
    });

    expect(result.current).toBeNull();
  });
});
