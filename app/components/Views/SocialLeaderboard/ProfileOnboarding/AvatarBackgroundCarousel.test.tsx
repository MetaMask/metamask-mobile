import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import type { HardwareTier } from '../../../../util/deviceCapability';
import { playSelection } from '../../../../util/haptics';
import AvatarBackgroundCarousel, {
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
    ).toHaveLength(5);
    expect(
      screen.getByRole('button', { name: 'Purple background' }),
    ).toBeSelected();
  });

  it('selects a tapped color', () => {
    const { onSelect } = renderCarousel();

    fireEvent.press(screen.getByTestId(optionTestId(3)));

    expect(onSelect).toHaveBeenCalledWith('lime');
  });

  it('selects the centered color when it is tapped again', () => {
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
