import React from 'react';
import { render, screen } from '@testing-library/react-native';
import RelatedAssetAvatar from './RelatedAssetAvatar';
import type { RelatedAssetImage } from '../utils/getRelatedAssetImageSource';

jest.mock('../../../UI/Perps/components/PerpsTokenLogo/PerpsTokenLogo', () => ({
  __esModule: true,
  default: ({ symbol, size }: { symbol: string; size?: number }) => {
    const { View, Text } = jest.requireActual('react-native');
    return (
      <View testID="perps-token-logo">
        <Text testID="perps-symbol">{symbol}</Text>
        <Text testID="perps-size">{size}</Text>
      </View>
    );
  },
}));

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  return {
    ...actual,
    AvatarToken: ({
      name,
      src,
      testID,
    }: {
      name?: string;
      src?: unknown;
      testID?: string;
    }) => {
      const { View, Text } = jest.requireActual('react-native');
      return (
        <View testID={testID ?? 'avatar-token'}>
          <Text testID="avatar-name">{name}</Text>
          <Text testID="avatar-src">
            {src ? JSON.stringify(src) : 'no-src'}
          </Text>
        </View>
      );
    },
  };
});

describe('RelatedAssetAvatar', () => {
  describe('kind routing', () => {
    it('renders PerpsTokenLogo with the symbol for perps kind', () => {
      const image: RelatedAssetImage = {
        kind: 'perps',
        symbol: 'xyz:TSLA',
        primary: 'https://cdn.example.com/hip3:xyz_TSLA.svg',
        fallback: 'https://hl.example.com/xyz:TSLA.svg',
      };

      render(<RelatedAssetAvatar name="Tesla" image={image} />);

      expect(screen.getByTestId('perps-token-logo')).toBeOnTheScreen();
      expect(screen.getByTestId('perps-symbol').props.children).toBe(
        'xyz:TSLA',
      );
    });

    it('passes size 40 to PerpsTokenLogo for visual parity with AvatarTokenSize.Lg', () => {
      const image: RelatedAssetImage = {
        kind: 'perps',
        symbol: 'xyz:BRENT',
        primary: 'https://cdn.example.com/hip3:xyz_BRENT.svg',
        fallback: 'https://hl.example.com/xyz:BRENT.svg',
      };

      render(<RelatedAssetAvatar name="Brent Oil" image={image} />);

      expect(screen.getByTestId('perps-size').props.children).toBe(40);
    });

    it('renders AvatarToken with bundled source for bundled kind', () => {
      const image: RelatedAssetImage = { kind: 'bundled', source: 100 };

      render(<RelatedAssetAvatar name="Bitcoin" image={image} />);

      expect(screen.getByTestId('avatar-token')).toBeOnTheScreen();
      expect(screen.queryByTestId('perps-token-logo')).toBeNull();
      expect(screen.getByTestId('avatar-src').props.children).toBe('100');
    });

    it('renders AvatarToken with uri for png kind', () => {
      const image: RelatedAssetImage = {
        kind: 'png',
        uri: 'https://static.cx.metamask.io/api/v1/tokenIcons/1/0xabc.png',
      };

      render(<RelatedAssetAvatar name="Some Token" image={image} />);

      expect(screen.getByTestId('avatar-token')).toBeOnTheScreen();
      expect(screen.queryByTestId('perps-token-logo')).toBeNull();
      expect(screen.getByTestId('avatar-src').props.children).toContain(
        'static.cx.metamask.io',
      );
    });

    it('renders AvatarToken with no src for undefined image', () => {
      render(<RelatedAssetAvatar name="Unknown" image={undefined} />);

      expect(screen.getByTestId('avatar-token')).toBeOnTheScreen();
      expect(screen.queryByTestId('perps-token-logo')).toBeNull();
      expect(screen.getByTestId('avatar-src').props.children).toBe('no-src');
    });
  });

  describe('stable src identity across re-renders', () => {
    it('passes the same src object reference for png kind across re-renders', () => {
      const image: RelatedAssetImage = {
        kind: 'png',
        uri: 'https://static.cx.metamask.io/token.png',
      };

      const { rerender } = render(
        <RelatedAssetAvatar name="Token" image={image} />,
      );

      const firstSrc = screen.getByTestId('avatar-src').props.children;

      rerender(<RelatedAssetAvatar name="Token" image={image} />);

      expect(screen.getByTestId('avatar-src').props.children).toBe(firstSrc);
    });

    it('uses the same PerpsTokenLogo symbol when image reference changes but values are equal', () => {
      const image1: RelatedAssetImage = {
        kind: 'perps',
        symbol: 'xyz:CL',
        primary: 'https://cdn.example.com/hip3:xyz_CL.svg',
        fallback: 'https://hl.example.com/xyz:CL.svg',
      };
      const image2: RelatedAssetImage = {
        kind: 'perps',
        symbol: 'xyz:CL',
        primary: 'https://cdn.example.com/hip3:xyz_CL.svg',
        fallback: 'https://hl.example.com/xyz:CL.svg',
      };

      const { rerender } = render(
        <RelatedAssetAvatar name="Crude Oil" image={image1} />,
      );

      expect(screen.getByTestId('perps-symbol').props.children).toBe('xyz:CL');

      rerender(<RelatedAssetAvatar name="Crude Oil" image={image2} />);

      expect(screen.getByTestId('perps-symbol').props.children).toBe('xyz:CL');
    });
  });

  describe('name prop', () => {
    it('forwards name to AvatarToken', () => {
      render(<RelatedAssetAvatar name="Ethereum" image={undefined} />);

      expect(screen.getByTestId('avatar-name').props.children).toBe('Ethereum');
    });
  });

  describe('size prop', () => {
    it('passes size=16 to PerpsTokenLogo for small carousel icons', () => {
      const image: RelatedAssetImage = {
        kind: 'perps',
        symbol: 'xyz:BRENT',
        primary: 'https://cdn.example.com/hip3:xyz_BRENT.svg',
        fallback: 'https://hl.example.com/xyz:BRENT.svg',
      };

      render(<RelatedAssetAvatar name="Brent Oil" image={image} size={16} />);

      expect(screen.getByTestId('perps-size').props.children).toBe(16);
    });

    it('defaults to size=40 for PerpsTokenLogo when size is not provided', () => {
      const image: RelatedAssetImage = {
        kind: 'perps',
        symbol: 'BTC',
        primary: 'https://cdn.example.com/BTC.svg',
        fallback: 'https://hl.example.com/BTC.svg',
      };

      render(<RelatedAssetAvatar name="Bitcoin" image={image} />);

      expect(screen.getByTestId('perps-size').props.children).toBe(40);
    });
  });
});
