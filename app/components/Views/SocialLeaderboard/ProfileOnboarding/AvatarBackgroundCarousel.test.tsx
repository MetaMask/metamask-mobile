import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import type { HardwareTier } from '../../../../util/deviceCapability';
import { playSelection } from '../../../../util/haptics';
import AvatarBackgroundCarousel, {
  AVATAR_FLICKER_IN_MS,
  AVATAR_FLICKER_OUT_MS,
  hapticBackgroundIndex,
} from './AvatarBackgroundCarousel';
import { SocialProfileOnboardingSelectorsIDs } from './SocialProfileOnboardingView.testIds';

jest.mock('../../../../util/haptics');

const mockGetHardwareTier = jest.fn<HardwareTier | null, []>();

jest.mock('../../../../util/deviceCapability', () => ({
  getHardwareTier: () => mockGetHardwareTier(),
}));

const optionTestId = (index: number) =>
  `${SocialProfileOnboardingSelectorsIDs.AVATAR_BACKGROUND_OPTION}-${index}`;

const artTestId = (id: string) =>
  `${SocialProfileOnboardingSelectorsIDs.AVATAR_PREVIEW_ART}-${id}`;

const renderCarousel = (
  selectedBackgroundId = 'background3',
  avatarPresetId = 'vr',
) => {
  const onSelect = jest.fn();
  const { rerender } = render(
    <AvatarBackgroundCarousel
      avatarPresetId={avatarPresetId}
      selectedBackgroundId={selectedBackgroundId}
      onSelect={onSelect}
    />,
  );
  fireEvent(
    screen.getByTestId(
      SocialProfileOnboardingSelectorsIDs.AVATAR_BACKGROUND_CAROUSEL,
    ),
    'layout',
    { nativeEvent: { layout: { width: 390, height: 126 } } },
  );
  const selectAvatar = (nextAvatarPresetId: string) =>
    rerender(
      <AvatarBackgroundCarousel
        avatarPresetId={nextAvatarPresetId}
        selectedBackgroundId={selectedBackgroundId}
        onSelect={onSelect}
      />,
    );
  return { onSelect, selectAvatar };
};

describe('hapticBackgroundIndex', () => {
  it('counts the next color once a third of the slot is crossed', () => {
    expect(hapticBackgroundIndex(2.34, 2)).toBe(2);
    expect(hapticBackgroundIndex(2.35, 2)).toBe(3);
  });

  it('counts the previous color once a third of the slot is crossed backward', () => {
    expect(hapticBackgroundIndex(2.66, 3)).toBe(3);
    expect(hapticBackgroundIndex(2.64, 3)).toBe(2);
  });
});

describe('AvatarBackgroundCarousel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetHardwareTier.mockReturnValue('HIGH');
  });

  it('renders one option per backdrop color once laid out', () => {
    renderCarousel();

    expect(
      screen.getAllByTestId(
        new RegExp(
          `^${SocialProfileOnboardingSelectorsIDs.AVATAR_BACKGROUND_OPTION}-`,
        ),
      ),
    ).toHaveLength(7);
    expect(
      screen.getByRole('button', { name: 'Purple background' }),
    ).toBeSelected();
  });

  it('labels the colors added with the AvatarSocial palette', () => {
    renderCarousel();

    expect(
      screen.getByRole('button', { name: 'Indigo background' }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: 'Pale lime background' }),
    ).toBeOnTheScreen();
  });

  it('selects a legacy backdrop id by its translated slot', () => {
    renderCarousel('sky');

    expect(
      screen.getByRole('button', { name: 'Sky background' }),
    ).toBeSelected();
  });

  it('selects a tapped color', () => {
    const { onSelect } = renderCarousel();

    fireEvent.press(screen.getByTestId(optionTestId(3)));

    expect(onSelect).toHaveBeenCalledWith('background4');
  });

  it('selects the centered color when it is tapped again', () => {
    const { onSelect } = renderCarousel();

    fireEvent.press(screen.getByTestId(optionTestId(2)));

    expect(onSelect).toHaveBeenCalledWith('background3');
    expect(playSelection).not.toHaveBeenCalled();
  });

  it('draws the blurred glow on capable devices', () => {
    renderCarousel();

    expect(
      screen.getByTestId(
        SocialProfileOnboardingSelectorsIDs.AVATAR_BACKGROUND_GLOW,
      ),
    ).toBeOnTheScreen();
  });

  it('leaves out the blurred glow on low-tier devices', () => {
    mockGetHardwareTier.mockReturnValue('LOW');

    renderCarousel();

    expect(
      screen.queryByTestId(
        SocialProfileOnboardingSelectorsIDs.AVATAR_BACKGROUND_GLOW,
      ),
    ).not.toBeOnTheScreen();
  });

  describe('avatar crossfade', () => {
    const flush = (ms = 500) => act(() => jest.advanceTimersByTime(ms));

    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('shows only the selected avatar', () => {
      renderCarousel();

      expect(screen.getByTestId(artTestId('vr'))).toHaveAnimatedStyle({
        opacity: 1,
      });
      expect(screen.getByTestId(artTestId('royal'))).toHaveAnimatedStyle({
        opacity: 0,
      });
    });

    it('flickers the preview once when the avatar changes', () => {
      const { selectAvatar } = renderCarousel();
      const flicker = screen.getByTestId(
        SocialProfileOnboardingSelectorsIDs.AVATAR_PREVIEW_FLICKER,
      );

      expect(flicker).toHaveAnimatedStyle({ opacity: 1 });

      selectAvatar('royal');
      flush(AVATAR_FLICKER_OUT_MS);

      expect(flicker).toHaveAnimatedStyle({ opacity: 0 });

      flush(AVATAR_FLICKER_IN_MS);

      expect(flicker).toHaveAnimatedStyle({ opacity: 1 });
    });

    it('fades the new avatar in and the previous one out', () => {
      const { selectAvatar } = renderCarousel();

      selectAvatar('royal');
      flush();

      expect(screen.getByTestId(artTestId('royal'))).toHaveAnimatedStyle({
        opacity: 1,
      });
      expect(screen.getByTestId(artTestId('vr'))).toHaveAnimatedStyle({
        opacity: 0,
      });
    });

    it('settles on the last avatar when switching mid-fade', () => {
      const { selectAvatar } = renderCarousel();

      selectAvatar('royal');
      flush(150);
      selectAvatar('goth');
      flush();

      expect(screen.getByTestId(artTestId('goth'))).toHaveAnimatedStyle({
        opacity: 1,
      });
      expect(screen.getByTestId(artTestId('royal'))).toHaveAnimatedStyle({
        opacity: 0,
      });
      expect(screen.getByTestId(artTestId('vr'))).toHaveAnimatedStyle({
        opacity: 0,
      });
    });

    it('shows the translated variant for a legacy preset id', () => {
      renderCarousel('background3', 'crown');

      expect(screen.getByTestId(artTestId('royal'))).toHaveAnimatedStyle({
        opacity: 1,
      });
    });

    it('shows the default avatar for an unknown preset', () => {
      renderCarousel('background3', 'unknown-preset');

      expect(screen.getByTestId(artTestId('vr'))).toHaveAnimatedStyle({
        opacity: 1,
      });
    });

    it('mounts only the selected avatar and swaps instantly on low-tier devices', () => {
      mockGetHardwareTier.mockReturnValue('LOW');
      const { selectAvatar } = renderCarousel();

      selectAvatar('royal');
      flush(20);

      expect(screen.getByTestId(artTestId('royal'))).toHaveAnimatedStyle({
        opacity: 1,
      });
      expect(screen.queryByTestId(artTestId('vr'))).not.toBeOnTheScreen();
    });
  });
});
