import React from 'react';
import { Text } from 'react-native';
import { act, render, screen } from '@testing-library/react-native';
import { RiveErrorType, type RiveError } from '@rive-app/react-native';
import {
  __getRivePropertySetter,
  __resetRiveMocks,
} from '../../../../__mocks__/rive-app-react-native';
import ProfileReadyAnimation from './ProfileReadyAnimation';
import { SocialProfileOnboardingSelectorsIDs } from './SocialProfileOnboardingView.testIds';
import {
  PROFILE_READY_RIVE_ARTBOARD,
  PROFILE_READY_RIVE_PATHS,
  PROFILE_READY_RIVE_STATE_MACHINE,
} from './profileOnboardingRive';

const mockUseRiveEnabled = jest.fn<boolean, []>();
const mockUseRiveFile = jest.fn();
const mockUseViewModelInstance = jest.fn();
const mockRiveViewProps: {
  current?: {
    artboardName?: string;
    stateMachineName?: string;
    onError?: (error: RiveError) => void;
  };
} = {};

jest.mock('./useProfileOnboardingRiveEnabled', () => ({
  useProfileOnboardingRiveEnabled: () => mockUseRiveEnabled(),
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
    useRiveFile: (input: unknown, options: unknown) =>
      mockUseRiveFile(input, options) ?? actual.useRiveFile(input, options),
    useViewModelInstance: (source: unknown, params: unknown) =>
      mockUseViewModelInstance(source, params) ??
      actual.useViewModelInstance(source, params),
  };
});

const fallback = (
  <Text testID={SocialProfileOnboardingSelectorsIDs.READY_FALLBACK}>
    fallback
  </Text>
);

const renderReady = (avatarPresetId = 'visor') =>
  render(
    <ProfileReadyAnimation
      displayName="Wen Cat"
      handle="wen-cat"
      avatarPresetId={avatarPresetId}
      avatarBackgroundId="lime"
      fallback={fallback}
    />,
  );

const lastBound = (path: string) =>
  __getRivePropertySetter(path).mock.calls.at(-1)?.[0];

describe('ProfileReadyAnimation', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    __resetRiveMocks();
    mockRiveViewProps.current = undefined;
    mockUseRiveEnabled.mockReturnValue(true);
  });

  it('renders the profile-ready artboard', () => {
    renderReady();

    expect(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.READY_ANIMATION),
    ).toBeOnTheScreen();
    expect(mockRiveViewProps.current).toEqual(
      expect.objectContaining({
        artboardName: PROFILE_READY_RIVE_ARTBOARD,
        stateMachineName: PROFILE_READY_RIVE_STATE_MACHINE,
      }),
    );
  });

  it('binds the display name, @handle and an unverified badge', () => {
    renderReady();

    expect(lastBound(PROFILE_READY_RIVE_PATHS.DISPLAY_NAME)).toBe('Wen Cat');
    expect(lastBound(PROFILE_READY_RIVE_PATHS.HANDLE)).toBe('@wen-cat');
    expect(lastBound(PROFILE_READY_RIVE_PATHS.IS_VERIFIED)).toBe(false);
  });

  it('draws the chosen avatar over the card', () => {
    renderReady('zombie');

    expect(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.READY_AVATAR),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(
        `${SocialProfileOnboardingSelectorsIDs.READY_AVATAR}-art`,
      ),
    ).toBeOnTheScreen();
  });

  it('supplies the bundled Inter font for the referenced font asset', () => {
    renderReady();

    expect(mockUseRiveFile).toHaveBeenCalledWith(expect.anything(), {
      referencedAssets: { Inter: { source: expect.anything() } },
    });
  });

  it('does not load the file when the animation is skipped', () => {
    mockUseRiveEnabled.mockReturnValue(false);

    renderReady();

    expect(mockUseRiveFile).toHaveBeenCalledWith(undefined, expect.anything());
    expect(mockUseRiveFile).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
    );
  });

  it('still draws an avatar when the preset is unknown', () => {
    renderReady('retired-preset');

    expect(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.READY_AVATAR),
    ).toBeOnTheScreen();
  });

  it('renders the fallback when animations are disabled', () => {
    mockUseRiveEnabled.mockReturnValue(false);

    renderReady();

    expect(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.READY_FALLBACK),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(SocialProfileOnboardingSelectorsIDs.READY_ANIMATION),
    ).not.toBeOnTheScreen();
  });

  it.each<[string, () => void]>([
    [
      'the file fails to load',
      () =>
        mockUseRiveFile.mockReturnValue({
          riveFile: null,
          isLoading: false,
          error: new Error('file not found'),
        }),
    ],
    [
      'the view model instance fails to load',
      () =>
        mockUseViewModelInstance.mockReturnValue({
          instance: null,
          isLoading: false,
          error: new Error('view model not found'),
        }),
    ],
  ])('renders the fallback when %s', (_label, arrange) => {
    arrange();

    renderReady();

    expect(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.READY_FALLBACK),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(SocialProfileOnboardingSelectorsIDs.READY_ANIMATION),
    ).not.toBeOnTheScreen();
  });

  it('switches to the fallback when Rive reports an error', () => {
    renderReady();

    act(() => {
      mockRiveViewProps.current?.onError?.({
        message: 'bad file',
        type: RiveErrorType.MalformedFile,
      });
    });

    expect(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.READY_FALLBACK),
    ).toBeOnTheScreen();
  });
});
