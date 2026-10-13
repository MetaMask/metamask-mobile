import React from 'react';
import { Image, Text } from 'react-native';
import { act, render, screen, waitFor } from '@testing-library/react-native';
import {
  RiveErrorType,
  RiveImages,
  type RiveError,
} from '@rive-app/react-native';
import {
  __getRivePropertySetter,
  __mockRiveImagePropertySet,
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
  };
});

const fallback = (
  <Text testID={SocialProfileOnboardingSelectorsIDs.READY_FALLBACK}>
    fallback
  </Text>
);

const renderReady = (avatarPresetId = 'fox-photo') =>
  render(
    <ProfileReadyAnimation
      displayName="Wen Cat"
      handle="wen-cat"
      avatarPresetId={avatarPresetId}
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

  it.each([
    ['a dev server URL', 'http://localhost:8081/superhero.png', 'URL'],
    ['an Android release resource', 'app_images_superhero', 'Resource'],
  ])(
    'binds an image avatar preset resolved to %s',
    async (_label, uri, loader) => {
      jest
        .spyOn(Image, 'resolveAssetSource')
        .mockReturnValue({ uri, width: 1, height: 1, scale: 1 });

      renderReady('fox-photo');

      await waitFor(() =>
        expect(__mockRiveImagePropertySet).toHaveBeenCalledWith({
          byteSize: 1,
        }),
      );
      expect(
        loader === 'URL'
          ? RiveImages.loadFromURLAsync
          : RiveImages.loadFromResourceAsync,
      ).toHaveBeenCalledWith(uri);
    },
  );

  it('keeps the embedded avatar for emoji presets', async () => {
    renderReady('fox-emoji');

    await act(async () => undefined);

    expect(__mockRiveImagePropertySet).not.toHaveBeenCalled();
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
