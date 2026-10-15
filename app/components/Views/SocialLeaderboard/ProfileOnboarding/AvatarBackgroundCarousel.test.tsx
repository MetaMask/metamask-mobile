import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import type { HardwareTier } from '../../../../util/deviceCapability';
import { playSelection } from '../../../../util/haptics';
import AvatarBackgroundCarousel from './AvatarBackgroundCarousel';
import { SocialProfileOnboardingSelectorsIDs } from './SocialProfileOnboardingView.testIds';

jest.mock('../../../../util/haptics');

const mockGetHardwareTier = jest.fn<HardwareTier | null, []>();

jest.mock('../../../../util/deviceCapability', () => ({
  getHardwareTier: () => mockGetHardwareTier(),
}));

const optionTestId = (index: number) =>
  `${SocialProfileOnboardingSelectorsIDs.AVATAR_BACKGROUND_OPTION}-${index}`;

const renderCarousel = (selectedBackgroundId = 'purple') => {
  const onSelect = jest.fn();
  render(
    <AvatarBackgroundCarousel
      avatarPresetId="visor"
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
  return { onSelect };
};

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
    ).toHaveLength(5);
    expect(
      screen.getByRole('button', { name: 'Purple background' }),
    ).toBeSelected();
  });

  it('selects a tapped color and plays a selection haptic', () => {
    const { onSelect } = renderCarousel();

    fireEvent.press(screen.getByTestId(optionTestId(3)));

    expect(onSelect).toHaveBeenCalledWith('lime');
    expect(playSelection).toHaveBeenCalledTimes(1);
  });

  it('skips the haptic when the tapped color is already settled', () => {
    const { onSelect } = renderCarousel();

    fireEvent.press(screen.getByTestId(optionTestId(2)));

    expect(onSelect).toHaveBeenCalledWith('purple');
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
});
