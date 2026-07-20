import {
  AvatarToken,
  AvatarTokenSize,
} from '@metamask/design-system-react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { BADGENETWORK_TEST_ID } from '../../../../../../../component-library/components/Badges/Badge/variants/BadgeNetwork/BadgeNetwork.constants';
import { getFallbackAssetImageUrls } from '../../../../../../UI/Assets/components/AssetLogo/AssetLogo.utils';
import type { BridgeToken } from '../../../../../../UI/Bridge/types';
import QuickBuyTokenIcon, {
  QUICK_BUY_TOKEN_ICON_AVATAR_TEST_ID,
} from './QuickBuyTokenIcon';

// CAKE (PancakeSwap) on BSC — a token whose static-CDN artwork lives under the
// checksummed address, the case TSA-647 calls out.
const CAKE_ADDRESS = '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82';
const BSC_CHAIN_ID = '0x38';

const createToken = (overrides: Partial<BridgeToken> = {}): BridgeToken => ({
  symbol: 'CAKE',
  name: 'PancakeSwap',
  address: CAKE_ADDRESS,
  decimals: 18,
  chainId: BSC_CHAIN_ID,
  ...overrides,
});

describe('QuickBuyTokenIcon', () => {
  it('renders a round AvatarToken from the token image with the requested size', () => {
    const token = createToken({ image: 'https://example.com/cake-own.png' });

    render(<QuickBuyTokenIcon token={token} size={AvatarTokenSize.Sm} />);

    const avatar = screen.UNSAFE_getByType(AvatarToken);
    expect(avatar.props).toStrictEqual(
      expect.objectContaining({
        name: 'CAKE',
        src: { uri: 'https://example.com/cake-own.png' },
        size: AvatarTokenSize.Sm,
      }),
    );
  });

  it('renders the component-library network badge used by the homepage token list', () => {
    const token = createToken({ image: 'https://example.com/cake-badge.png' });

    render(<QuickBuyTokenIcon token={token} />);

    expect(screen.getByTestId(BADGENETWORK_TEST_ID)).toBeOnTheScreen();
  });

  it('falls back to the shared static-CDN token icon when the token has no image', () => {
    const token = createToken({ image: undefined });
    const expectedFallbackUrl = getFallbackAssetImageUrls(
      BSC_CHAIN_ID,
      CAKE_ADDRESS,
    )?.[0];

    render(<QuickBuyTokenIcon token={token} />);

    const avatar = screen.UNSAFE_getByType(AvatarToken);
    expect(avatar.props.src).toStrictEqual({ uri: expectedFallbackUrl });
  });

  it('resolves the same fallback image list as the homepage token list', () => {
    // The hook receives the token image first, then the static-CDN fallbacks
    // (lowercased + checksummed address variants) used by AssetLogo.
    const token = createToken({ image: 'https://example.com/cake-list.png' });
    const fallbackUrls = getFallbackAssetImageUrls(BSC_CHAIN_ID, CAKE_ADDRESS);

    render(<QuickBuyTokenIcon token={token} />);

    fireEvent(
      screen.getByTestId(QUICK_BUY_TOKEN_ICON_AVATAR_TEST_ID),
      'error',
      { nativeEvent: {} },
    );

    const avatar = screen.UNSAFE_getByType(AvatarToken);
    expect(avatar.props.src).toStrictEqual({ uri: fallbackUrls?.[0] });
  });

  it('cycles through to the checksummed CDN variant when earlier images fail', () => {
    const token = createToken({ image: 'https://example.com/cake-cycle.png' });
    const fallbackUrls = getFallbackAssetImageUrls(BSC_CHAIN_ID, CAKE_ADDRESS);

    render(<QuickBuyTokenIcon token={token} />);

    // own image fails -> lowercase CDN fails -> checksummed CDN remains.
    fireEvent(
      screen.getByTestId(QUICK_BUY_TOKEN_ICON_AVATAR_TEST_ID),
      'error',
      { nativeEvent: {} },
    );
    fireEvent(
      screen.getByTestId(QUICK_BUY_TOKEN_ICON_AVATAR_TEST_ID),
      'error',
      { nativeEvent: {} },
    );

    const avatar = screen.UNSAFE_getByType(AvatarToken);
    expect(avatar.props.src).toStrictEqual({ uri: fallbackUrls?.[1] });
  });
});
