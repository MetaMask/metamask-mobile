import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { AvatarNetworkSize } from '@metamask/design-system-react-native';

import {
  PERPS_AVAILABLE_BALANCE_LOGO_SIZE,
  PERPS_PROVIDER_LOGO_AVATAR_MAX_PX,
} from '../../constants/perpsUIConfig';
import { PerpsProviderLogosSelectorsIDs } from '../../Perps.testIds';
import PerpsProviderLogos, {
  mapPerpsLogoPixelsToAvatarSize,
} from './PerpsProviderLogos';

// Unit, not component-view: this is a presentational contract (provider ids →
// marks and an accessible name). It has no Redux or navigation. Placement on
// Perps home is covered by PerpsHomeView.view.test.tsx and the balance row
// tests in PerpsMarketBalanceActions.test.tsx.

describe('mapPerpsLogoPixelsToAvatarSize', () => {
  it('maps the available-balance size onto the extra-small avatar', () => {
    expect(
      mapPerpsLogoPixelsToAvatarSize(PERPS_AVAILABLE_BALANCE_LOGO_SIZE),
    ).toBe(AvatarNetworkSize.Xs);
  });

  it('maps the medium pixel bound onto the medium avatar', () => {
    expect(
      mapPerpsLogoPixelsToAvatarSize(PERPS_PROVIDER_LOGO_AVATAR_MAX_PX.Md),
    ).toBe(AvatarNetworkSize.Md);
  });

  it('maps sizes above the large bound onto the extra-large avatar', () => {
    expect(
      mapPerpsLogoPixelsToAvatarSize(PERPS_PROVIDER_LOGO_AVATAR_MAX_PX.Lg + 1),
    ).toBe(AvatarNetworkSize.Xl);
  });
});

describe('PerpsProviderLogos', () => {
  it('renders nothing for an empty provider list', () => {
    render(<PerpsProviderLogos providerIds={[]} />);

    expect(
      screen.queryByTestId(PerpsProviderLogosSelectorsIDs.CONTAINER),
    ).toBeNull();
  });

  it('announces HyperLiquid for a single Hyperliquid mark', () => {
    render(<PerpsProviderLogos providerIds={['hyperliquid']} />);

    expect(screen.getByLabelText('HyperLiquid')).toBeOnTheScreen();
    expect(
      screen.getByTestId(PerpsProviderLogosSelectorsIDs.HYPERLIQUID),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(PerpsProviderLogosSelectorsIDs.LIGHTER),
    ).toBeNull();
  });

  it('announces Lighter for a single Lighter mark', () => {
    render(<PerpsProviderLogos providerIds={['lighter']} />);

    expect(screen.getByLabelText('Lighter')).toBeOnTheScreen();
    expect(
      screen.getByTestId(PerpsProviderLogosSelectorsIDs.LIGHTER),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(PerpsProviderLogosSelectorsIDs.HYPERLIQUID),
    ).toBeNull();
  });

  it('announces both names when the marks overlap', () => {
    render(<PerpsProviderLogos providerIds={['hyperliquid', 'lighter']} />);

    expect(screen.getByLabelText('HyperLiquid, Lighter')).toBeOnTheScreen();
    expect(
      screen.getByTestId(PerpsProviderLogosSelectorsIDs.HYPERLIQUID),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(PerpsProviderLogosSelectorsIDs.LIGHTER),
    ).toBeOnTheScreen();
  });
});
