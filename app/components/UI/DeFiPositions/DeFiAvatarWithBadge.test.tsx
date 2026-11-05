import React from 'react';
import { render, screen } from '@testing-library/react-native';
import DeFiAvatarWithBadge from './DeFiAvatarWithBadge';
import metamaskFoxLogo from '../../../images/branding/fox.png';

const OLD_METAMASK_ICON_URL =
  'https://raw.githubusercontent.com/MetaMask/metamask-extension/master/app/images/logo/metamask-fox-bg.svg';

describe('DeFiAvatarWithBadge', () => {
  it('renders the bundled MetaMask logo for the MetaMask protocol', () => {
    render(
      <DeFiAvatarWithBadge
        avatarName="MetaMask"
        avatarIconUrl={OLD_METAMASK_ICON_URL}
        protocolId="metamask"
        networkIconAvatar={undefined}
      />,
    );

    expect(screen.getByTestId('token-avatar-image').props.source).toBe(
      metamaskFoxLogo,
    );
  });

  it('renders the API icon URL for other protocols', () => {
    const iconUrl = 'https://example.com/aave.png';

    render(
      <DeFiAvatarWithBadge
        avatarName="Aave v3"
        avatarIconUrl={iconUrl}
        protocolId="aave-v3"
        networkIconAvatar={undefined}
      />,
    );

    expect(screen.getByTestId('token-avatar-image').props.source).toStrictEqual(
      { uri: iconUrl },
    );
  });
});
