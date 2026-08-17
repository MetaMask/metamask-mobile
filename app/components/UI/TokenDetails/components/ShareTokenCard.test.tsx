import React from 'react';
import { render } from '@testing-library/react-native';
import { strings } from '../../../../../locales/i18n';
import ShareTokenCard from './ShareTokenCard';
import type { TokenI } from '../../Tokens/types';

jest.mock('react-native-qrcode-svg', () => 'QRCode');

jest.mock('../../Assets/components/AssetLogo/AssetLogo', () => ({
  __esModule: true,
  default: () => null,
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
  statTiles: [
    {
      label: strings('share_token.market_cap'),
      value: '$100.00M',
      testID: 'share-token-market-cap',
    },
    {
      label: strings('share_token.price'),
      value: '$1.00',
      testID: 'share-token-price',
    },
    {
      label: strings('share_token.liquidity'),
      value: '$10.00M',
      testID: 'share-token-liquidity',
    },
    {
      label: strings('share_token.holders'),
      value: '28.78K',
      testID: 'share-token-holders',
    },
    {
      label: strings('share_token.volume_24h'),
      value: '$75.57M',
      testID: 'share-token-volume',
    },
  ],
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
        statTiles={defaultProps.statTiles.map((tile) => ({
          ...tile,
          value: null,
        }))}
      />,
    );

    expect(getAllByText('—').length).toBeGreaterThanOrEqual(4);
  });

  it('formats footer timestamp with GMT offset and DD/MM/YYYY date', () => {
    const { getByText } = render(<ShareTokenCard {...defaultProps} />);

    expect(getByText(/\d{2}:\d{2} GMT[+-]\d{2}:\d{2}/)).toBeTruthy();
    expect(getByText('15/07/2026')).toBeTruthy();
  });
});
