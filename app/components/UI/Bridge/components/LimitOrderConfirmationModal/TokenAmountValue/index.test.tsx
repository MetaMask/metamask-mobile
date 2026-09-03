import React from 'react';
import { render } from '@testing-library/react-native';
import { createMockTokenWithBalance } from '../../../testUtils';
import { TokenAvatarSelectorsIDs } from '../TokenAvatar/testIds';
import { TokenAmountValue } from '.';
import { TokenAmountValueSelectorsIDs } from './testIds';

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

describe('TokenAmountValue', () => {
  it('renders the amount', () => {
    const { getByTestId } = render(<TokenAmountValue amount="0.1 ETH" />);

    expect(
      getByTestId(TokenAmountValueSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    expect(getByTestId(TokenAmountValueSelectorsIDs.AMOUNT)).toHaveTextContent(
      '0.1 ETH',
    );
  });

  it('renders the token avatar when a token is provided', () => {
    const { getByTestId } = render(
      <TokenAmountValue amount="0.1 ETH" token={mockToken} />,
    );

    expect(getByTestId(TokenAvatarSelectorsIDs.TOKEN)).toBeOnTheScreen();
  });

  it('hides the token avatar when no token is provided', () => {
    const { queryByTestId } = render(<TokenAmountValue amount="0.1 ETH" />);

    expect(queryByTestId(TokenAvatarSelectorsIDs.TOKEN)).toBeNull();
  });

  it('renders a network badge on the avatar when withNetworkBadge is true', () => {
    const { getByTestId } = render(
      <TokenAmountValue amount="$1.69" token={mockToken} withNetworkBadge />,
    );

    expect(
      getByTestId(TokenAvatarSelectorsIDs.NETWORK_BADGE),
    ).toBeOnTheScreen();
  });

  it('applies a custom testID when provided', () => {
    const { getByTestId, queryByTestId } = render(
      <TokenAmountValue amount="0.1 ETH" testID="custom-amount" />,
    );

    expect(getByTestId('custom-amount')).toHaveTextContent('0.1 ETH');
    expect(queryByTestId(TokenAmountValueSelectorsIDs.AMOUNT)).toBeNull();
  });
});
