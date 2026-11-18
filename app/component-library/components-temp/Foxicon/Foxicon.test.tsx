import React from 'react';
import { render, screen } from '@testing-library/react-native';

import Foxicon, { isFoxiconVariant } from './Foxicon';
import { assetByFoxiconVariant } from './Foxicon.assets';
import {
  FOXICON_FALLBACK_VARIANT,
  FoxiconVariant,
  RetiredFoxiconVariant,
} from './Foxicon.types';

describe('Foxicon', () => {
  it('renders the asset for the given variant at the given size', () => {
    render(<Foxicon variant={FoxiconVariant.Zombie} size={64} testID="fox" />);

    expect(screen.getByTestId('fox')).toHaveProp(
      'source',
      assetByFoxiconVariant[FoxiconVariant.Zombie],
    );
    expect(screen.getByTestId('fox')).toHaveStyle({ width: 64, height: 64 });
  });

  it.each(Object.values(RetiredFoxiconVariant))(
    'renders the fallback asset for the retired %s variant',
    (variant) => {
      render(<Foxicon variant={variant} size={32} testID="fox" />);

      expect(screen.getByTestId('fox')).toHaveProp(
        'source',
        assetByFoxiconVariant[FOXICON_FALLBACK_VARIANT],
      );
    },
  );

  it('renders the fallback asset for an unknown variant', () => {
    render(
      <Foxicon
        variant={'not-a-fox' as FoxiconVariant}
        size={32}
        testID="fox"
      />,
    );

    expect(screen.getByTestId('fox')).toHaveProp(
      'source',
      assetByFoxiconVariant[FOXICON_FALLBACK_VARIANT],
    );
  });

  it.each(Object.values(FoxiconVariant))(
    'has an asset registered for the %s variant',
    (variant) => {
      expect(assetByFoxiconVariant[variant]).toBeDefined();
      expect(isFoxiconVariant(variant)).toBe(true);
    },
  );

  it('does not treat retired, unknown, or missing variants as current', () => {
    expect(isFoxiconVariant(RetiredFoxiconVariant.Base)).toBe(false);
    expect(isFoxiconVariant('toString')).toBe(false);
    expect(isFoxiconVariant(undefined)).toBe(false);
  });
});
