import React from 'react';
import { act } from '@testing-library/react-native';
import {
  AvatarToken,
  AvatarTokenSize,
} from '@metamask/design-system-react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import PositionTokenAvatar from './PositionTokenAvatar';
import type { Position } from '@metamask/social-controllers';
import BadgeWrapper from '../../../../component-library/components/Badges/BadgeWrapper';
import BadgeNetwork from '../../../../component-library/components/Badges/Badge/variants/BadgeNetwork';
import PerpsTokenLogo from '../../../UI/Perps/components/PerpsTokenLogo';

jest.mock('@metamask/design-system-react-native', () => ({
  ...jest.requireActual('@metamask/design-system-react-native'),
  AvatarToken: jest.fn(() => null),
}));

jest.mock('../../../UI/Perps/components/PerpsTokenLogo', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));

jest.mock('../../../UI/Bridge/hooks/useAssetMetadata/utils', () => ({
  getAssetImageUrl: jest.fn(
    (_address: string, chainId: string) =>
      `https://static.cx.metamask.io/${chainId}.png`,
  ),
}));

jest.mock('../utils/chainMapping', () => ({
  HYPERLIQUID_CHAIN_NAME: 'hyperliquid',
  chainNameToId: jest.fn((chain: string) =>
    chain === 'base' ? 'eip155:8453' : undefined,
  ),
  getPositionNetworkBadge: jest.fn((chain: string) => {
    if (chain === 'base') {
      return { name: 'base', imageSource: { uri: 'base.png' } };
    }
    if (chain === 'hyperliquid') {
      return { name: 'Hyperliquid', imageSource: { uri: 'hyperevm.png' } };
    }
    return undefined;
  }),
}));

jest.mock(
  '../../../../component-library/components/Badges/BadgeWrapper',
  () => ({
    __esModule: true,
    default: jest.fn(() => null),
    BadgePosition: { BottomRight: 'bottom-right' },
  }),
);

jest.mock(
  '../../../../component-library/components/Badges/Badge/variants/BadgeNetwork',
  () => ({
    __esModule: true,
    default: jest.fn(() => null),
  }),
);

jest.mock('../../../../util/networks', () => ({
  getNetworkImageSource: jest.fn(() => ({ uri: 'network.png' })),
}));

const MockAvatarToken = AvatarToken as jest.Mock;
const MockBadgeWrapper = BadgeWrapper as unknown as jest.Mock;
const MockBadgeNetwork = BadgeNetwork as jest.Mock;
const MockPerpsTokenLogo = PerpsTokenLogo as unknown as jest.Mock;

const lastPerpsTokenLogoProps = () =>
  MockPerpsTokenLogo.mock.calls[
    MockPerpsTokenLogo.mock.calls.length - 1
  ][0] as {
    symbol: string;
    size: number;
    recyclingKey?: string;
  };

const lastAvatarTokenProps = () =>
  MockAvatarToken.mock.calls[MockAvatarToken.mock.calls.length - 1][0] as {
    src?: { uri: string };
    name: string;
    size: AvatarTokenSize;
    imageOrSvgProps: {
      onImageError: () => void;
      onSvgError: () => void;
    };
  };

const basePosition: Position = {
  positionId: 'starkbot-base',
  tokenSymbol: 'STARKBOT',
  tokenName: 'Starkbot',
  tokenAddress: '0xabc',
  chain: 'base',
  positionAmount: 1000,
  boughtUsd: 500,
  soldUsd: 0,
  realizedPnl: 0,
  costBasis: 500,
  trades: [],
  lastTradeAt: Date.now(),
  tokenImageUrl: 'https://assets.daylight.xyz/starkbot.png',
};

describe('PositionTokenAvatar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with the Clicker URL when tokenImageUrl is set', () => {
    renderWithProvider(<PositionTokenAvatar position={basePosition} />);

    expect(lastAvatarTokenProps().src).toEqual({
      uri: 'https://assets.daylight.xyz/starkbot.png',
    });
  });

  it('falls back to the MetaMask CDN URL on the first image error', () => {
    renderWithProvider(<PositionTokenAvatar position={basePosition} />);

    act(() => {
      lastAvatarTokenProps().imageOrSvgProps.onImageError();
    });

    expect(lastAvatarTokenProps().src).toEqual({
      uri: 'https://static.cx.metamask.io/eip155:8453.png',
    });
  });

  it('falls back to monogram (undefined src) on the second image error', () => {
    renderWithProvider(<PositionTokenAvatar position={basePosition} />);

    act(() => {
      lastAvatarTokenProps().imageOrSvgProps.onImageError();
    });

    act(() => {
      lastAvatarTokenProps().imageOrSvgProps.onImageError();
    });

    expect(lastAvatarTokenProps().src).toBeUndefined();
  });

  it('falls back to monogram via onSvgError on the second error', () => {
    renderWithProvider(<PositionTokenAvatar position={basePosition} />);

    act(() => {
      lastAvatarTokenProps().imageOrSvgProps.onSvgError();
    });

    act(() => {
      lastAvatarTokenProps().imageOrSvgProps.onSvgError();
    });

    expect(lastAvatarTokenProps().src).toBeUndefined();
  });

  it('skips to MetaMask CDN URL on initial render when tokenImageUrl is null', () => {
    const position = { ...basePosition, tokenImageUrl: null };

    renderWithProvider(<PositionTokenAvatar position={position} />);

    expect(lastAvatarTokenProps().src).toEqual({
      uri: 'https://static.cx.metamask.io/eip155:8453.png',
    });
  });

  it('skips to MetaMask CDN URL on initial render when tokenImageUrl is undefined', () => {
    const position = { ...basePosition, tokenImageUrl: undefined };

    renderWithProvider(<PositionTokenAvatar position={position} />);

    expect(lastAvatarTokenProps().src).toEqual({
      uri: 'https://static.cx.metamask.io/eip155:8453.png',
    });
  });

  it('renders with undefined src immediately when chain is unsupported and tokenImageUrl is absent', () => {
    const position = {
      ...basePosition,
      chain: 'unsupported',
      tokenImageUrl: undefined,
    };

    renderWithProvider(<PositionTokenAvatar position={position} />);

    expect(lastAvatarTokenProps().src).toBeUndefined();
  });

  it('falls back to monogram when chain is unsupported and the Clicker URL errors', () => {
    const position = { ...basePosition, chain: 'unsupported' };

    renderWithProvider(<PositionTokenAvatar position={position} />);

    act(() => {
      lastAvatarTokenProps().imageOrSvgProps.onImageError();
    });

    expect(lastAvatarTokenProps().src).toBeUndefined();
  });

  it('passes the token symbol as the name prop to AvatarToken', () => {
    renderWithProvider(<PositionTokenAvatar position={basePosition} />);

    expect(lastAvatarTokenProps().name).toBe('STARKBOT');
  });

  it('uses the Lg size by default', () => {
    renderWithProvider(<PositionTokenAvatar position={basePosition} />);

    expect(lastAvatarTokenProps().size).toBe(AvatarTokenSize.Lg);
  });

  it('forwards a custom size prop to AvatarToken', () => {
    renderWithProvider(
      <PositionTokenAvatar position={basePosition} size={AvatarTokenSize.Md} />,
    );

    expect(lastAvatarTokenProps().size).toBe(AvatarTokenSize.Md);
  });

  it('resets to the Clicker URL when the position prop changes to one with a tokenImageUrl', () => {
    const nextPosition: Position = {
      ...basePosition,
      tokenAddress: '0xdef',
      tokenImageUrl: 'https://assets.daylight.xyz/newtoken.png',
    };

    const { rerender } = renderWithProvider(
      <PositionTokenAvatar position={basePosition} />,
    );

    act(() => {
      lastAvatarTokenProps().imageOrSvgProps.onImageError();
    });

    rerender(<PositionTokenAvatar position={nextPosition} />);

    expect(lastAvatarTokenProps().src).toEqual({
      uri: 'https://assets.daylight.xyz/newtoken.png',
    });
  });

  it('resets to MetaMask CDN URL when the position prop changes to one without tokenImageUrl', () => {
    const nextPosition: Position = {
      ...basePosition,
      tokenAddress: '0xdef',
      tokenImageUrl: null,
    };

    const { rerender } = renderWithProvider(
      <PositionTokenAvatar position={basePosition} />,
    );

    act(() => {
      lastAvatarTokenProps().imageOrSvgProps.onImageError();
    });

    rerender(<PositionTokenAvatar position={nextPosition} />);

    expect(lastAvatarTokenProps().src).toEqual({
      uri: 'https://static.cx.metamask.io/eip155:8453.png',
    });
  });

  describe('showChainBadge', () => {
    it('wraps the avatar in BadgeWrapper when showChainBadge is true and the chain resolves', () => {
      renderWithProvider(
        <PositionTokenAvatar position={basePosition} showChainBadge />,
      );

      expect(MockBadgeWrapper).toHaveBeenCalled();
    });

    it('passes a BadgeNetwork as the badgeElement when showChainBadge is true', () => {
      renderWithProvider(
        <PositionTokenAvatar position={basePosition} showChainBadge />,
      );

      const badgeElement = MockBadgeWrapper.mock.calls[0][0]
        .badgeElement as React.ReactElement;
      expect(badgeElement.type).toBe(MockBadgeNetwork);
    });

    it('does not wrap the avatar in BadgeWrapper when showChainBadge is false by default', () => {
      renderWithProvider(<PositionTokenAvatar position={basePosition} />);

      expect(MockBadgeWrapper).not.toHaveBeenCalled();
    });

    it('does not wrap the avatar in BadgeWrapper when the chain is unsupported', () => {
      const position = { ...basePosition, chain: 'unsupported' };

      renderWithProvider(
        <PositionTokenAvatar position={position} showChainBadge />,
      );

      expect(MockBadgeWrapper).not.toHaveBeenCalled();
    });

    it('wraps the avatar in a Hyperliquid network badge for a hyperliquid position', () => {
      const position = { ...basePosition, chain: 'hyperliquid' };

      renderWithProvider(
        <PositionTokenAvatar position={position} showChainBadge />,
      );

      expect(MockBadgeWrapper).toHaveBeenCalled();
      const badgeElement = MockBadgeWrapper.mock.calls[0][0]
        .badgeElement as React.ReactElement<{ name: string }>;
      expect(badgeElement.props.name).toBe('Hyperliquid');
    });
  });

  describe('hyperliquid positions', () => {
    const hyperliquidPosition: Position = {
      ...basePosition,
      positionId: 'ondo-hl',
      tokenSymbol: 'ONDO',
      tokenAddress: 'ONDO',
      chain: 'hyperliquid',
      // Clicker serves a blank/dark placeholder here, so it must be ignored.
      tokenImageUrl: 'https://clicker.example/ondo-blank.jpg',
    };

    it('renders PerpsTokenLogo with the token symbol instead of AvatarToken', () => {
      renderWithProvider(
        <PositionTokenAvatar position={hyperliquidPosition} />,
      );

      expect(MockAvatarToken).not.toHaveBeenCalled();
      expect(MockPerpsTokenLogo).toHaveBeenCalled();
      expect(lastPerpsTokenLogoProps().symbol).toBe('ONDO');
    });

    it('does not use the unreliable Clicker tokenImageUrl', () => {
      renderWithProvider(
        <PositionTokenAvatar position={hyperliquidPosition} />,
      );

      // PerpsTokenLogo resolves icons from the symbol; no Clicker URI is forwarded.
      expect(MockPerpsTokenLogo).toHaveBeenCalled();
      expect(MockAvatarToken).not.toHaveBeenCalled();
    });

    it('maps the AvatarToken size to the matching pixel size', () => {
      renderWithProvider(
        <PositionTokenAvatar
          position={hyperliquidPosition}
          size={AvatarTokenSize.Md}
        />,
      );

      expect(lastPerpsTokenLogoProps().size).toBe(32);
    });

    it('defaults to the Lg pixel size', () => {
      renderWithProvider(
        <PositionTokenAvatar position={hyperliquidPosition} />,
      );

      expect(lastPerpsTokenLogoProps().size).toBe(40);
    });

    it('still wraps the perps logo in the Hyperliquid network badge', () => {
      renderWithProvider(
        <PositionTokenAvatar position={hyperliquidPosition} showChainBadge />,
      );

      expect(MockBadgeWrapper).toHaveBeenCalled();
      const badgeElement = MockBadgeWrapper.mock.calls[0][0]
        .badgeElement as React.ReactElement<{ name: string }>;
      expect(badgeElement.props.name).toBe('Hyperliquid');
    });
  });
});
