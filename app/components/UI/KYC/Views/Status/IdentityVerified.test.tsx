import React from 'react';
import { act, fireEvent } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import KycIdentityVerified, {
  KycIdentityVerifiedSelectorsIDs,
} from './IdentityVerified';
import { useTrackKycResultViewed } from '../../hooks/useTrackKycResultViewed';
import { useReduceMotionState } from '../../../Money/hooks/useReduceMotion';
import { useNetworkTier } from '../../../../../hooks/useNetworkTier';
import { VerifiedCheckAnimationSelectors } from '../../components/VerifiedCheckAnimation.testIds';
import { VERIFIED_SUCCESS_ENTRANCE_TIMEOUT_MS } from '../../hooks/useVerifiedSuccessCascade';

jest.mock('../../hooks/useTrackKycResultViewed');

jest.mock('../../../Money/hooks/useReduceMotion', () => ({
  useReduceMotionState: jest.fn(),
}));

jest.mock('../../../../../hooks/useNetworkTier', () => ({
  useNetworkTier: jest.fn(),
}));

jest.mock('../../../../../util/deviceCapability', () => ({
  getHardwareTier: jest.fn(() => 'HIGH'),
}));

const mockUseReduceMotionState = jest.mocked(useReduceMotionState);
const mockUseNetworkTier = jest.mocked(useNetworkTier);

describe('KycIdentityVerified', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseReduceMotionState.mockReturnValue(true);
    mockUseNetworkTier.mockReturnValue('WIFI');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders the verified copy', () => {
    const onExit = jest.fn();
    const onContinue = jest.fn();
    const { getByText } = renderWithProvider(
      <KycIdentityVerified onExit={onExit} onContinue={onContinue} />,
    );

    expect(getByText(strings('kyc.identity_verified.title'))).toBeOnTheScreen();
    expect(
      getByText(strings('kyc.identity_verified.description')),
    ).toBeOnTheScreen();
    expect(onContinue).not.toHaveBeenCalled();
    expect(onExit).not.toHaveBeenCalled();
  });

  it('hands Continue to the caller', () => {
    const onExit = jest.fn();
    const onContinue = jest.fn();
    const { getByTestId } = renderWithProvider(
      <KycIdentityVerified onExit={onExit} onContinue={onContinue} />,
    );

    fireEvent.press(
      getByTestId(KycIdentityVerifiedSelectorsIDs.CONTINUE_BUTTON),
    );

    expect(onContinue).toHaveBeenCalledTimes(1);
    expect(onExit).not.toHaveBeenCalled();
  });

  it('hands Back to the caller', () => {
    const onExit = jest.fn();
    const onContinue = jest.fn();
    const { getByTestId } = renderWithProvider(
      <KycIdentityVerified onExit={onExit} onContinue={onContinue} />,
    );

    fireEvent.press(getByTestId(KycIdentityVerifiedSelectorsIDs.BACK_BUTTON));

    expect(onExit).toHaveBeenCalledTimes(1);
    expect(onContinue).not.toHaveBeenCalled();
  });

  it('reports the approved result as viewed', () => {
    renderWithProvider(
      <KycIdentityVerified onExit={jest.fn()} onContinue={jest.fn()} />,
    );

    expect(useTrackKycResultViewed).toHaveBeenCalledWith('approved');
  });

  it.each([
    ['Reduce Motion is on', true, 'WIFI'],
    ['there is no network', false, 'NONE'],
  ] as const)(
    'shows the static checkmark and a pressable button when %s',
    (_, reduceMotion, networkTier) => {
      mockUseReduceMotionState.mockReturnValue(reduceMotion);
      mockUseNetworkTier.mockReturnValue(networkTier);

      const { getByTestId } = renderWithProvider(
        <KycIdentityVerified onExit={jest.fn()} onContinue={jest.fn()} />,
      );

      expect(
        getByTestId(VerifiedCheckAnimationSelectors.CHECK_IMAGE),
      ).toBeOnTheScreen();
      expect(getByTestId(KycIdentityVerifiedSelectorsIDs.FOOTER)).toHaveProp(
        'pointerEvents',
        'auto',
      );
    },
  );

  it('keeps Continue pressable when the network returns after a static open', () => {
    mockUseReduceMotionState.mockReturnValue(false);
    mockUseNetworkTier.mockReturnValue('NONE');
    const { getByTestId, rerender } = renderWithProvider(
      <KycIdentityVerified onExit={jest.fn()} onContinue={jest.fn()} />,
    );

    expect(getByTestId(KycIdentityVerifiedSelectorsIDs.FOOTER)).toHaveProp(
      'pointerEvents',
      'auto',
    );

    mockUseNetworkTier.mockReturnValue('WIFI');
    rerender(<KycIdentityVerified onExit={jest.fn()} onContinue={jest.fn()} />);

    expect(getByTestId(KycIdentityVerifiedSelectorsIDs.FOOTER)).toHaveProp(
      'pointerEvents',
      'auto',
    );
  });

  it('plays the tick and ignores Continue until its fade-in starts', () => {
    jest.useFakeTimers();
    mockUseReduceMotionState.mockReturnValue(false);
    const onContinue = jest.fn();
    const { getByTestId } = renderWithProvider(
      <KycIdentityVerified onExit={jest.fn()} onContinue={onContinue} />,
    );

    expect(
      getByTestId(VerifiedCheckAnimationSelectors.CHECK_ANIMATION),
    ).toBeOnTheScreen();
    expect(getByTestId(KycIdentityVerifiedSelectorsIDs.FOOTER)).toHaveProp(
      'pointerEvents',
      'none',
    );
    fireEvent.press(
      getByTestId(KycIdentityVerifiedSelectorsIDs.CONTINUE_BUTTON),
    );
    expect(onContinue).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(VERIFIED_SUCCESS_ENTRANCE_TIMEOUT_MS);
    });

    expect(getByTestId(KycIdentityVerifiedSelectorsIDs.FOOTER)).toHaveProp(
      'pointerEvents',
      'auto',
    );
  });
});
