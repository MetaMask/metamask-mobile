import { brandColor } from '@metamask/design-tokens';
import { render, screen } from '@testing-library/react-native';
import React from 'react';
import superheroAvatar from '../../../../../images/socialV1/superhero.png';
import { getProfileAvatarPreset } from '../avatarPresets';
import ProfileAvatar from './ProfileAvatar';

const TEST_ID = 'profile-avatar';

describe('ProfileAvatar', () => {
  it('shows a remote image when the profile has one', () => {
    render(
      <ProfileAvatar
        imageUrl="https://example.com/me.png"
        avatarPresetId="zombie"
        testID={TEST_ID}
      />,
    );

    expect(screen.getByTestId(TEST_ID)).toHaveProp('source', {
      uri: 'https://example.com/me.png',
    });
  });

  it('draws the preset over the saved backdrop color', () => {
    render(
      <ProfileAvatar
        avatarPresetId="zombie"
        avatarBackgroundId="lime"
        testID={TEST_ID}
      />,
    );

    expect(screen.getByTestId(TEST_ID)).toHaveStyle({
      backgroundColor: brandColor.lime100,
    });
    expect(screen.getByTestId(`${TEST_ID}-art`)).toHaveProp(
      'source',
      getProfileAvatarPreset('zombie')?.source,
    );
  });

  it('falls back to the default backdrop when no color is saved', () => {
    render(<ProfileAvatar avatarPresetId="zombie" testID={TEST_ID} />);

    expect(screen.getByTestId(TEST_ID)).toHaveStyle({
      backgroundColor: brandColor.purple300,
    });
  });

  it('shows the bundled fox for an unknown preset', () => {
    render(<ProfileAvatar avatarPresetId="retired-preset" testID={TEST_ID} />);

    expect(screen.getByTestId(TEST_ID)).toHaveProp('source', superheroAvatar);
  });
});
