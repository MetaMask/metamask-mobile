import React from 'react';
import { screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import QuickBuyBanners from './QuickBuyBanners';

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

describe('QuickBuyBanners', () => {
  it('renders nothing when no warnings are active', () => {
    const { toJSON } = renderWithProvider(
      <QuickBuyBanners isHardwareSolanaBlocked={false} />,
    );
    expect(toJSON()).toBeNull();
  });

  it('renders the hardware-wallet + Solana banner when blocked', () => {
    renderWithProvider(<QuickBuyBanners isHardwareSolanaBlocked />);
    expect(
      screen.getByText('bridge.hardware_wallet_not_supported_solana'),
    ).toBeOnTheScreen();
  });

  it('does not render price-impact banners (handled by modal and pill)', () => {
    renderWithProvider(<QuickBuyBanners isHardwareSolanaBlocked={false} />);
    expect(
      screen.queryByText('bridge.price_impact_error_title'),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByText('bridge.price_impact_warning_title'),
    ).not.toBeOnTheScreen();
  });
});
