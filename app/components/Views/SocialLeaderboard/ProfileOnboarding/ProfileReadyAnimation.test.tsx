import React from 'react';
import { Image, Text } from 'react-native';
import { act, render, screen, waitFor } from '@testing-library/react-native';
import {
  RiveErrorType,
  RiveImages,
  type RiveError,
  type RiveImage,
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

      renderReady('visor');

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

  it('stays on the animation without an avatar when the image fails to load', async () => {
    jest.spyOn(Image, 'resolveAssetSource').mockReturnValue({
      uri: 'http://x/a.png',
      width: 1,
      height: 1,
      scale: 1,
    });
    jest
      .mocked(RiveImages.loadFromURLAsync)
      .mockRejectedValueOnce(new Error('404'));

    renderReady('visor');
    await act(async () => undefined);

    expect(RiveImages.loadFromURLAsync).toHaveBeenCalled();
    expect(__mockRiveImagePropertySet).not.toHaveBeenCalled();
    expect(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.READY_ANIMATION),
    ).toBeOnTheScreen();
  });

  it('ignores an avatar that resolves after unmount', async () => {
    jest.spyOn(Image, 'resolveAssetSource').mockReturnValue({
      uri: 'http://x/a.png',
      width: 1,
      height: 1,
      scale: 1,
    });
    let resolveImage: (image: RiveImage) => void = () => undefined;
    jest.mocked(RiveImages.loadFromURLAsync).mockImplementationOnce(
      () =>
        new Promise<RiveImage>((resolve) => {
          resolveImage = resolve;
        }),
    );

    const { unmount } = renderReady('visor');
    unmount();
    await act(async () => {
      resolveImage({ byteSize: 1 } as RiveImage);
    });

    expect(__mockRiveImagePropertySet).not.toHaveBeenCalled();
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

  it('keeps the embedded avatar for unknown presets', async () => {
    renderReady('retired-preset');

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
