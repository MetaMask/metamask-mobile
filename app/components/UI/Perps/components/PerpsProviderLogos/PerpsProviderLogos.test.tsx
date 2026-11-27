import React from 'react';
import { render, screen } from '@testing-library/react-native';

import { mockTheme } from '../../../../../util/theme';
import { PERPS_AVAILABLE_BALANCE_LOGO_SIZE } from '../../constants/perpsUIConfig';
import { PerpsProviderLogosSelectorsIDs } from '../../Perps.testIds';
import PerpsProviderLogos from './PerpsProviderLogos';

// Unit, not component-view: this is a presentational contract (provider ids →
// marks and an accessible name). It has no Redux or navigation. Placement on
// Perps home is covered by PerpsHomeView.view.test.tsx and the balance row
// tests in PerpsMarketBalanceActions.test.tsx.

describe('squared mark geometry (design: 2px radius on 12px, 8px on 40px)', () => {
  it('renders a mark at the exact pixel size requested', () => {
    render(<PerpsProviderLogos providerIds={['hyperliquid']} size={12} />);

    const mark = screen.getByTestId(PerpsProviderLogosSelectorsIDs.HYPERLIQUID);
    expect(mark).toHaveStyle({ width: 12, height: 12 });
  });

  it('uses the 2px design radius on a 12px mark', () => {
    render(<PerpsProviderLogos providerIds={['hyperliquid']} size={12} />);

    expect(
      screen.getByTestId(PerpsProviderLogosSelectorsIDs.HYPERLIQUID),
    ).toHaveStyle({ borderRadius: 2 });
  });

  it('uses the 8px design radius on a 40px mark', () => {
    render(<PerpsProviderLogos providerIds={['lighter']} size={40} />);

    expect(
      screen.getByTestId(PerpsProviderLogosSelectorsIDs.LIGHTER),
    ).toHaveStyle({ borderRadius: 8 });
  });

  it('overlaps a stacked pair by 40 percent of the mark size', () => {
    render(
      <PerpsProviderLogos providerIds={['hyperliquid', 'lighter']} size={16} />,
    );

    // 6px overlap at 16px, the home design's stacked pair.
    expect(
      screen.getByTestId(PerpsProviderLogosSelectorsIDs.HYPERLIQUID),
    ).toHaveStyle({ marginRight: -6 });
    expect(
      screen.getByTestId(PerpsProviderLogosSelectorsIDs.LIGHTER),
    ).not.toHaveStyle({ marginRight: expect.any(Number) });
  });

  it('carries a hairline border using the themed border color', () => {
    render(
      <PerpsProviderLogos
        providerIds={['hyperliquid']}
        size={PERPS_AVAILABLE_BALANCE_LOGO_SIZE}
      />,
    );

    const mark = screen.getByTestId(PerpsProviderLogosSelectorsIDs.HYPERLIQUID);
    expect(mark).toHaveStyle({
      borderWidth: expect.any(Number),
      borderColor: mockTheme.colors.border.muted,
    });
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

  it('renders the marks but hides them from screen readers when decorative', () => {
    render(<PerpsProviderLogos providerIds={['lighter']} isDecorative />);

    // The container is rendered but hidden from the accessibility tree, so it
    // is only findable when hidden elements are included.
    const container = screen.getByTestId(
      PerpsProviderLogosSelectorsIDs.CONTAINER,
      { includeHiddenElements: true },
    );
    expect(container).toBeOnTheScreen();
    expect(container).toHaveProp('accessibilityElementsHidden', true);
    expect(container).toHaveProp(
      'importantForAccessibility',
      'no-hide-descendants',
    );

    // The mark still renders (hidden); default queries skip hidden elements.
    expect(
      screen.getByTestId(PerpsProviderLogosSelectorsIDs.LIGHTER, {
        includeHiddenElements: true,
      }),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(PerpsProviderLogosSelectorsIDs.LIGHTER),
    ).toBeNull();
    expect(screen.queryByLabelText('Lighter')).toBeNull();
  });
});
