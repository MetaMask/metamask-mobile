import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import render from '#app/util/test/renderWithProvider';
import { strings } from '../../../../../locales/i18n';
import { collectiblesTestIds } from '#app/components/UI/Collectibles/Collectibles.testIds';
import type { PackDetail } from '#app/components/UI/Collectibles/types/packs';
import { PackDetailHeader } from '#app/components/UI/Collectibles/components/PackDetailHeader';

const pack: PackDetail = {
  code: 'pack-1',
  name: 'Lorem ipsum',
  category: 'Pokémon',
  tier: 1,
  priceUsd: 25,
  imageUrl: 'https://example.com/pack.png',
  isAvailable: true,
  buybackRatePercent: 85,
  averageCardValueUsd: 27.5,
  topCardValueUsd: 360,
  odds: [],
  pulledSinceEpic: [],
  activity: {
    openerName: 'Lorem',
    otherOpeners: 1240,
    pullerName: 'Ipsum',
    pulledRarity: 'rare',
  },
};

describe('PackDetailHeader', () => {
  it('shows the pack name', () => {
    render(<PackDetailHeader pack={pack} />);

    expect(screen.getByText('Lorem ipsum')).toBeOnTheScreen();
  });

  it('shows the category and tier', () => {
    render(<PackDetailHeader pack={pack} />);

    expect(screen.getByText('Pokémon · Tier 1')).toBeOnTheScreen();
  });

  it('shows only the category without a tier', () => {
    render(<PackDetailHeader pack={{ ...pack, tier: undefined }} />);

    expect(screen.getByText('Pokémon')).toBeOnTheScreen();
  });

  it('shows the buyback rate', () => {
    render(<PackDetailHeader pack={pack} />);

    expect(screen.getByText('85%')).toBeOnTheScreen();
  });

  it('shows the average card value', () => {
    render(<PackDetailHeader pack={pack} />);

    expect(screen.getByText('$27.50')).toBeOnTheScreen();
  });

  it('shows the top card value', () => {
    render(<PackDetailHeader pack={pack} />);

    expect(screen.getByText('$360.00')).toBeOnTheScreen();
  });

  it('shows a dash for each stat that is missing', () => {
    render(
      <PackDetailHeader
        pack={{
          ...pack,
          buybackRatePercent: undefined,
          averageCardValueUsd: undefined,
          topCardValueUsd: undefined,
        }}
      />,
    );

    expect(
      screen.getAllByText(strings('collectibles.pack_detail.no_value')),
    ).toHaveLength(3);
  });

  it('shows the artwork fallback when there is no image', () => {
    render(<PackDetailHeader pack={{ ...pack, imageUrl: undefined }} />);

    expect(
      screen.getByTestId(collectiblesTestIds.packDetailArtFallback),
    ).toBeOnTheScreen();
  });

  it('shows the artwork fallback when the image fails to load', () => {
    render(<PackDetailHeader pack={pack} />);

    fireEvent(screen.getByTestId(collectiblesTestIds.packDetailArt), 'error');

    expect(
      screen.getByTestId(collectiblesTestIds.packDetailArtFallback),
    ).toBeOnTheScreen();
  });
});
