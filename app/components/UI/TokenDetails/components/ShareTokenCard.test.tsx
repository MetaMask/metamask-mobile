import React from 'react';
import { render } from '@testing-library/react-native';
import { strings } from '../../../../../locales/i18n';
import ShareTokenCard from './ShareTokenCard';
import type { TokenI } from '../../Tokens/types';

jest.mock('react-native-qrcode-svg', () => 'QRCode');

jest.mock('../../NetworkAssetLogo', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../../Assets/components/AssetLogo/AssetLogo.utils', () => ({
  getFallbackAssetImageUrls: jest.fn(() => []),
}));

jest.mock('../../Assets/components/AssetLogo/AssetLogo.hook', () => ({
  useSmartImageFallback: jest.fn(() => ({
    source: undefined,
    onError: jest.fn(),
    uniqueSourceImageKey: 'avatar-key',
  })),
}));

jest.mock('../../../../images/branding/fox.png', () => 'fox-logo');

const mockToken: TokenI = {
  address: '0x6b175474e89094c44da98b954eedeac495271d0f',
  chainId: '0x1',
  symbol: 'DAI',
  name: 'Dai Stablecoin',
  decimals: 18,
  image: 'https://example.com/dai.png',
  balance: '0',
  logo: undefined,
  isETH: false,
};

const defaultProps = {
  token: mockToken,
  shareUrl:
    'https://link.metamask.io/asset?assetId=eip155%3A1%2Ferc20%3A0x6b17',
  priceChangePercent: 5,
  formattedPrice: '$1.00',
  marketCap: '$100.00M',
  liquidity: '$10.00M',
  holdersCount: '28.78K',
  volume24h: '$75.57M',
};

describe('ShareTokenCard', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-15T10:09:00+02:00'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders token identity, stats, and branding', () => {
    const { getByText, getByTestId } = render(
      <ShareTokenCard {...defaultProps} />,
    );

    expect(getByText('Dai Stablecoin')).toBeTruthy();
    expect(getByText('DAI')).toBeTruthy();
    expect(getByText('+5.00%')).toBeTruthy();
    expect(getByText(strings('share_token.change_24h'))).toBeTruthy();
    expect(getByText('$100.00M')).toBeTruthy();
    expect(getByText('$1.00')).toBeTruthy();
    expect(getByText('$10.00M')).toBeTruthy();
    expect(getByText('28.78K')).toBeTruthy();
    expect(getByText('$75.57M')).toBeTruthy();
    expect(getByText(strings('share_token.buy_on'))).toBeTruthy();
    expect(getByText(strings('share_token.metamask'))).toBeTruthy();
    expect(getByTestId('share-token-card')).toBeTruthy();
    expect(getByTestId('share-token-fox-logo')).toBeTruthy();
    expect(getByTestId('share-token-qr-tile')).toBeTruthy();
  });

  it('prefixes negative price change with a minus sign', () => {
    const { getByText } = render(
      <ShareTokenCard {...defaultProps} priceChangePercent={-32.88} />,
    );

    expect(getByText('-32.88%')).toBeTruthy();
  });

  it('renders em dash placeholders for missing stat values', () => {
    const { getAllByText } = render(
      <ShareTokenCard
        {...defaultProps}
        marketCap={null}
        liquidity={null}
        holdersCount={null}
        volume24h={null}
      />,
    );

    expect(getAllByText('—').length).toBeGreaterThanOrEqual(4);
  });

  it('formats footer timestamp with GMT offset and DD/MM/YYYY date', () => {
    const { getByText } = render(<ShareTokenCard {...defaultProps} />);

    expect(getByText(/\d{2}:\d{2} \(GMT[+-]\d{2}:\d{2}\)/)).toBeTruthy();
    expect(getByText('15/07/2026')).toBeTruthy();
  });
});
