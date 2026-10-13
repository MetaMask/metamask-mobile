import React from 'react';
import { Text } from 'react-native';
import { act, render, screen } from '@testing-library/react-native';
import { RiveErrorType, type RiveError } from '@rive-app/react-native';
import {
  __resetRiveMocks,
  __setRivePropertyValue,
} from '../../../../__mocks__/rive-app-react-native';
import ProfileOnboardingIntroAnimation, {
  PROFILE_ONBOARDING_SCENE_DWELL_MS,
} from './ProfileOnboardingIntroAnimation';
import { SocialProfileOnboardingSelectorsIDs } from './SocialProfileOnboardingView.testIds';
import {
  PROFILE_ONBOARDING_RIVE_ARTBOARD,
  PROFILE_ONBOARDING_RIVE_PATHS,
  PROFILE_ONBOARDING_RIVE_STATE_MACHINE,
} from './profileOnboardingRive';
import type { NetworkTier } from '../../../../hooks/useNetworkTier';
import type { HardwareTier } from '../../../../util/deviceCapability';

const mockUseNetworkTier = jest.fn<NetworkTier | null, []>();
const mockGetHardwareTier = jest.fn<HardwareTier | null, []>();
const mockUseReducedMotion = jest.fn<boolean, []>();
const mockFireContinue = jest.fn();
const mockUseRiveFile = jest.fn();
const mockRiveViewProps: {
  current?: {
    artboardName?: string;
    stateMachineName?: string;
    dataBind?: unknown;
    onError?: (error: RiveError) => void;
  };
} = {};

jest.mock('../../../../hooks/useNetworkTier', () => ({
  useNetworkTier: () => mockUseNetworkTier(),
}));

jest.mock('../../../../util/deviceCapability', () => ({
  getHardwareTier: () => mockGetHardwareTier(),
}));

jest.mock('react-native-reanimated', () => ({
  ...jest.requireActual('react-native-reanimated'),
  useReducedMotion: () => mockUseReducedMotion(),
}));

jest.mock('../../../../util/Logger', () => ({
  error: jest.fn(),
}));

jest.mock('@rive-app/react-native', () => {
  const actual = jest.requireActual('@rive-app/react-native');
  const ReactActual = jest.requireActual('react');
  return {
    ...actual,
    RiveView: (props: Record<string, unknown>) => {
      mockRiveViewProps.current = props;
      return ReactActual.createElement(actual.RiveView, props);
    },
    useRiveFile: (input: unknown, options: unknown) => {
      mockUseRiveFile(input, options);
      return actual.useRiveFile(input, options);
    },
    useRiveTrigger: (path: string) => ({
      trigger: path === 'continue' ? mockFireContinue : jest.fn(),
      error: null,
    }),
  };
});

const fallback = (
  <Text testID={SocialProfileOnboardingSelectorsIDs.INTRO_FALLBACK}>
    fallback
  </Text>
);

describe('ProfileOnboardingIntroAnimation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetRiveMocks();
    mockRiveViewProps.current = undefined;
    mockUseNetworkTier.mockReturnValue('WIFI');
    mockGetHardwareTier.mockReturnValue('HIGH');
    mockUseReducedMotion.mockReturnValue(false);
  });

  it('renders the onboarding artboard bound to its view model', () => {
    render(<ProfileOnboardingIntroAnimation fallback={fallback} />);

    expect(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.INTRO_ANIMATION),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(SocialProfileOnboardingSelectorsIDs.INTRO_FALLBACK),
    ).not.toBeOnTheScreen();
    expect(mockRiveViewProps.current).toEqual(
      expect.objectContaining({
        artboardName: PROFILE_ONBOARDING_RIVE_ARTBOARD,
        stateMachineName: PROFILE_ONBOARDING_RIVE_STATE_MACHINE,
        dataBind: expect.anything(),
      }),
    );
  });

  it('supplies the bundled Inter font for the referenced font asset', () => {
    render(<ProfileOnboardingIntroAnimation fallback={fallback} />);

    expect(mockUseRiveFile).toHaveBeenCalledWith(expect.anything(), {
      referencedAssets: { Inter: { source: expect.anything() } },
    });
  });

  it('renders the animation when both tiers are unknown', () => {
    mockUseNetworkTier.mockReturnValue(null);
    mockGetHardwareTier.mockReturnValue(null);

    render(<ProfileOnboardingIntroAnimation fallback={fallback} />);

    expect(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.INTRO_ANIMATION),
    ).toBeOnTheScreen();
  });

  it.each<[string, () => void]>([
    ['offline', () => mockUseNetworkTier.mockReturnValue('NONE')],
    [
      'low hardware on slow cellular',
      () => {
        mockGetHardwareTier.mockReturnValue('LOW');
        mockUseNetworkTier.mockReturnValue('SLOW_CELLULAR');
      },
    ],
    ['Reduce Motion is on', () => mockUseReducedMotion.mockReturnValue(true)],
  ])('renders the fallback when %s', (_label, arrange) => {
    arrange();

    render(<ProfileOnboardingIntroAnimation fallback={fallback} />);

    expect(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.INTRO_FALLBACK),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(SocialProfileOnboardingSelectorsIDs.INTRO_ANIMATION),
    ).not.toBeOnTheScreen();
  });

  describe('auto-advance', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    const setCurrentStep = (step: number) => {
      act(() => {
        __setRivePropertyValue(
          PROFILE_ONBOARDING_RIVE_PATHS.CURRENT_STEP,
          step,
        );
      });
    };

    it('fires continue after each scene dwell until Post', () => {
      render(<ProfileOnboardingIntroAnimation fallback={fallback} />);

      setCurrentStep(1);
      act(() => {
        jest.advanceTimersByTime(
          (PROFILE_ONBOARDING_SCENE_DWELL_MS[1] ?? 0) - 1,
        );
      });
      expect(mockFireContinue).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(1);
      });
      expect(mockFireContinue).toHaveBeenCalledTimes(1);

      setCurrentStep(2);
      act(() => {
        jest.advanceTimersByTime(PROFILE_ONBOARDING_SCENE_DWELL_MS[2] ?? 0);
      });
      expect(mockFireContinue).toHaveBeenCalledTimes(2);

      setCurrentStep(3);
      act(() => {
        jest.advanceTimersByTime(60_000);
      });
      expect(mockFireContinue).toHaveBeenCalledTimes(2);
    });

    it('does not advance while the fallback is shown', () => {
      mockUseNetworkTier.mockReturnValue('NONE');
      render(<ProfileOnboardingIntroAnimation fallback={fallback} />);

      setCurrentStep(1);
      act(() => {
        jest.advanceTimersByTime(60_000);
      });

      expect(mockFireContinue).not.toHaveBeenCalled();
    });

    it('cancels the pending continue on unmount', () => {
      const { unmount } = render(
        <ProfileOnboardingIntroAnimation fallback={fallback} />,
      );
      setCurrentStep(1);

      unmount();
      act(() => {
        jest.advanceTimersByTime(60_000);
      });

      expect(mockFireContinue).not.toHaveBeenCalled();
    });
  });

  it('switches to the fallback when Rive reports an error', () => {
    render(<ProfileOnboardingIntroAnimation fallback={fallback} />);

    act(() => {
      mockRiveViewProps.current?.onError?.({
        message: 'bad file',
        type: RiveErrorType.MalformedFile,
      });
    });

    expect(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.INTRO_FALLBACK),
    ).toBeOnTheScreen();
  });
});
