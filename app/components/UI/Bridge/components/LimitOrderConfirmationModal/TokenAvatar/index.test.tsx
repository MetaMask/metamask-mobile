import React from 'react';
import { render } from '@testing-library/react-native';
import { getNetworkImageSource } from '../../../../../../util/networks';
import { getTokenImageSource } from '../../../utils';
import { createMockTokenWithBalance } from '../../../testUtils';
import TokenAvatar from '.';
import { TokenAvatarSelectorsIDs } from './testIds';

jest.mock('../../../../../../util/networks', () => ({
  ...jest.requireActual('../../../../../../util/networks'),
  getNetworkImageSource: jest.fn(() => ({ uri: 'https://network.icon' })),
}));

jest.mock('../../../utils', () => ({
  ...jest.requireActual('../../../utils'),
  getTokenImageSource: jest.fn(() => ({ uri: 'https://token.icon' })),
}));

const mockToken = createMockTokenWithBalance({
  symbol: 'ETH',
  name: 'Ether',
});

describe('TokenAvatar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(getNetworkImageSource)
      .mockReturnValue({ uri: 'https://network.icon' });
    jest
      .mocked(getTokenImageSource)
      .mockReturnValue({ uri: 'https://token.icon' });
  });

  it('renders the token avatar without a network badge by default', () => {
    const { getByTestId, queryByTestId } = render(
      <TokenAvatar token={mockToken} />,
    );

    expect(getByTestId(TokenAvatarSelectorsIDs.TOKEN)).toBeOnTheScreen();
    expect(queryByTestId(TokenAvatarSelectorsIDs.NETWORK_BADGE)).toBeNull();
  });

  it('renders a network badge when withNetworkBadge is true', () => {
    const { getByTestId } = render(
      <TokenAvatar token={mockToken} withNetworkBadge />,
    );

    expect(getByTestId(TokenAvatarSelectorsIDs.TOKEN)).toBeOnTheScreen();
    expect(
      getByTestId(TokenAvatarSelectorsIDs.NETWORK_BADGE),
    ).toBeOnTheScreen();
    expect(
      getByTestId(TokenAvatarSelectorsIDs.NETWORK_IMAGE),
    ).toBeOnTheScreen();
  });

  it('hides the network image when no network image source is available', () => {
    jest.mocked(getNetworkImageSource).mockReturnValue(undefined);

    const { getByTestId, queryByTestId } = render(
      <TokenAvatar token={mockToken} withNetworkBadge />,
    );

    expect(
      getByTestId(TokenAvatarSelectorsIDs.NETWORK_BADGE),
    ).toBeOnTheScreen();
    expect(queryByTestId(TokenAvatarSelectorsIDs.NETWORK_IMAGE)).toBeNull();
  });

  it('applies a custom testID when provided', () => {
    const { getByTestId, queryByTestId } = render(
      <TokenAvatar token={mockToken} testID="custom-token-avatar" />,
    );

    expect(getByTestId('custom-token-avatar')).toBeOnTheScreen();
    expect(queryByTestId(TokenAvatarSelectorsIDs.TOKEN)).toBeNull();
  });
});
