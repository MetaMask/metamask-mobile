import React from 'react';
import { screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import QuickBuyBanners from './QuickBuyBanners';

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

const renderBanners = (
  overrides: Partial<React.ComponentProps<typeof QuickBuyBanners>> = {},
) =>
  renderWithProvider(
    <QuickBuyBanners
      isHardwareSolanaBlocked={false}
      isPriceImpactError={false}
      isPriceImpactWarning={false}
      formattedPriceImpact="-"
      {...overrides}
    />,
  );

describe('QuickBuyBanners', () => {
  it('renders nothing when no warnings are active', () => {
    const { toJSON } = renderBanners();
    expect(toJSON()).toBeNull();
  });

  it('renders the hardware-wallet + Solana banner when blocked', () => {
    renderBanners({ isHardwareSolanaBlocked: true });
    expect(
      screen.getByText('bridge.hardware_wallet_not_supported_solana'),
    ).toBeOnTheScreen();
  });

  it('renders the price-impact error banner with formatted percentage', () => {
    renderBanners({
      isPriceImpactError: true,
      formattedPriceImpact: '30.00%',
    });

    expect(
      screen.getByText('bridge.price_impact_error_title'),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(/bridge\.price_impact_error_description.*30\.00%/),
    ).toBeOnTheScreen();
  });

  it('renders the price-impact warning banner with formatted percentage', () => {
    renderBanners({
      isPriceImpactWarning: true,
      formattedPriceImpact: '7.50%',
    });

    expect(
      screen.getByText('bridge.price_impact_warning_title'),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(/bridge\.price_impact_warning_description.*7\.50%/),
    ).toBeOnTheScreen();
  });

  it('stacks multiple banners when several conditions fire', () => {
    renderBanners({
      isHardwareSolanaBlocked: true,
      isPriceImpactWarning: true,
      formattedPriceImpact: '7.50%',
    });

    expect(
      screen.getByText('bridge.hardware_wallet_not_supported_solana'),
    ).toBeOnTheScreen();
    expect(
      screen.getByText('bridge.price_impact_warning_title'),
    ).toBeOnTheScreen();
  });
});
