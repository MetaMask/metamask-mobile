import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { AvatarNetwork } from '@metamask/design-system-react-native';

import PerpsProviderLogos, {
  getPerpsProviderLogoIds,
  PERPS_PROVIDER_LOGOS_TEST_ID,
} from './PerpsProviderLogos';

// Unit, not component-view: this is a presentational contract (provider ids →
// marks and an accessible name). It has no Redux or navigation. Placement on
// Perps home is covered by PerpsHomeView.view.test.tsx and the balance row
// tests in PerpsMarketBalanceActions.test.tsx.

describe('getPerpsProviderLogoIds', () => {
  it('returns the Hyperliquid mark for the Hyperliquid provider', () => {
    const logoIds = getPerpsProviderLogoIds('hyperliquid');

    expect(logoIds).toEqual(['hyperliquid']);
  });

  it('returns the Lighter mark for the Lighter provider', () => {
    const logoIds = getPerpsProviderLogoIds('lighter');

    expect(logoIds).toEqual(['lighter']);
  });

  it('returns Hyperliquid then Lighter for aggregated mode', () => {
    const logoIds = getPerpsProviderLogoIds('aggregated');

    expect(logoIds).toEqual(['hyperliquid', 'lighter']);
  });

  it('returns no marks when the provider is missing', () => {
    const logoIds = getPerpsProviderLogoIds(undefined);

    expect(logoIds).toEqual([]);
  });
});

describe('PerpsProviderLogos', () => {
  it('renders nothing for an empty provider list', () => {
    render(<PerpsProviderLogos providerIds={[]} />);

    expect(screen.queryByTestId(PERPS_PROVIDER_LOGOS_TEST_ID)).toBeNull();
  });

  it('announces HyperLiquid for a single Hyperliquid mark', () => {
    render(<PerpsProviderLogos providerIds={['hyperliquid']} testID="logos" />);

    expect(screen.getByLabelText('HyperLiquid')).toBeOnTheScreen();
    expect(screen.getByTestId('logos-hyperliquid')).toBeOnTheScreen();
    expect(screen.queryByTestId('logos-lighter')).toBeNull();
  });

  it('announces Lighter for a single Lighter mark', () => {
    render(<PerpsProviderLogos providerIds={['lighter']} testID="logos" />);

    expect(screen.getByLabelText('Lighter')).toBeOnTheScreen();
    expect(screen.getByTestId('logos-lighter')).toBeOnTheScreen();
    expect(screen.queryByTestId('logos-hyperliquid')).toBeNull();
  });

  it('overlaps Hyperliquid under Lighter and announces both names', () => {
    const { UNSAFE_getAllByType: getAllByType } = render(
      <PerpsProviderLogos
        providerIds={['hyperliquid', 'lighter']}
        size={16}
        testID="logos"
      />,
    );

    expect(screen.getByLabelText('HyperLiquid, Lighter')).toBeOnTheScreen();
    expect(screen.getByTestId('logos-hyperliquid')).toBeOnTheScreen();
    expect(screen.getByTestId('logos-lighter')).toBeOnTheScreen();

    const [hyperliquid, lighter] = getAllByType(AvatarNetwork);
    expect(hyperliquid.props.size).toBe('xs');
    expect(hyperliquid.props.twClassName).toBe('-mr-1.5');
    expect(lighter.props.twClassName).toBeUndefined();
    expect(lighter.props.style).toEqual({ zIndex: 2 });
  });

  it('maps a 32px size onto the medium avatar', () => {
    const { UNSAFE_getByType: getByType } = render(
      <PerpsProviderLogos providerIds={['lighter']} size={32} />,
    );

    expect(getByType(AvatarNetwork).props.size).toBe('md');
  });
});
