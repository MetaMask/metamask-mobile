import { brandColor } from '@metamask/design-tokens';
import { render, screen } from '@testing-library/react-native';
import React from 'react';
import superheroAvatar from '../../../../../images/socialV1/superhero.png';
import ProfileAvatar from './ProfileAvatar';

jest.mock('../../../../../component-library/components-temp/Foxicon', () => {
  const { createElement } = jest.requireActual<typeof import('react')>('react');
  const { Text } =
    jest.requireActual<typeof import('react-native')>('react-native');

  return {
    ...jest.requireActual(
      '../../../../../component-library/components-temp/Foxicon',
    ),
    __esModule: true,
    default: ({
      variant,
      size,
      testID,
    }: {
      variant: string;
      size: number;
      testID?: string;
    }) => createElement(Text, { testID }, `${variant} ${size}`),
  };
});

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

  it('renders AvatarSocial when the size is an AvatarBase size', () => {
    render(
      <ProfileAvatar
        avatarPresetId="zombie"
        avatarBackgroundId="background7"
        size="sm"
        testID={TEST_ID}
      />,
    );

    expect(screen.getByTestId(TEST_ID)).toHaveProp(
      'accessibilityRole',
      'image',
    );
    expect(screen.getByTestId(TEST_ID)).toHaveStyle({
      backgroundColor: brandColor.lime100,
    });
    expect(screen.getByText('zombie 40')).toBeOnTheScreen();
  });

  it('draws the fox on a colored circle for sizes AvatarBase lacks', () => {
    render(
      <ProfileAvatar
        avatarPresetId="zombie"
        avatarBackgroundId="background7"
        size="xl"
        testID={TEST_ID}
      />,
    );

    expect(screen.getByTestId(TEST_ID)).toHaveStyle({
      backgroundColor: brandColor.lime100,
      width: 96,
      height: 96,
    });
    expect(screen.getByTestId(`${TEST_ID}-art`)).toHaveTextContent('zombie 96');
  });

  it('honors a custom diameter', () => {
    render(
      <ProfileAvatar avatarPresetId="zombie" diameter={28} testID={TEST_ID} />,
    );

    expect(screen.getByTestId(TEST_ID)).toHaveStyle({ width: 28, height: 28 });
    expect(screen.getByText('zombie 28')).toBeOnTheScreen();
  });

  it('renders legacy preset and backdrop ids with the new artwork', () => {
    render(
      <ProfileAvatar
        avatarPresetId="visor"
        avatarBackgroundId="sky"
        size="md"
        testID={TEST_ID}
      />,
    );

    expect(screen.getByTestId(TEST_ID)).toHaveStyle({
      backgroundColor: brandColor.indigo200,
    });
    expect(screen.getByText('vr 48')).toBeOnTheScreen();
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
