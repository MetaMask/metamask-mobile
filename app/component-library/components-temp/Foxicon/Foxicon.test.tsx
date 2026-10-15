import React from 'react';
import { render, screen } from '@testing-library/react-native';

import Foxicon from './Foxicon';
import { AssetByFoxiconVariant, FoxiconVariant } from './Foxicon.types';

jest.mock('./Foxicon.assets', () => {
  const { createElement } = jest.requireActual<typeof import('react')>('react');
  const { Text } =
    jest.requireActual<typeof import('react-native')>('react-native');
  const { FoxiconVariant: variants } =
    jest.requireActual<typeof import('./Foxicon.types')>('./Foxicon.types');

  return {
    assetByFoxiconVariant: Object.fromEntries(
      Object.values(variants).map((variant) => [
        variant,
        ({
          width,
          height,
          testID,
        }: {
          width: number;
          height: number;
          testID?: string;
        }) => createElement(Text, { testID }, `${variant} ${width}x${height}`),
      ]),
    ),
  };
});

describe('Foxicon', () => {
  it('renders the asset for the given variant at the given size', () => {
    render(<Foxicon variant={FoxiconVariant.Zombie} size={64} />);

    expect(screen.getByText('zombie 64x64')).toBeOnTheScreen();
  });

  it('applies the provided testID', () => {
    render(
      <Foxicon variant={FoxiconVariant.Base} size={32} testID="custom-fox" />,
    );

    expect(screen.getByTestId('custom-fox')).toBeOnTheScreen();
  });

  it.each(Object.values(FoxiconVariant))(
    'has an asset registered for the %s variant',
    (variant) => {
      const { assetByFoxiconVariant } = jest.requireActual<{
        assetByFoxiconVariant: AssetByFoxiconVariant;
      }>('./Foxicon.assets');

      expect(assetByFoxiconVariant[variant]).toBeDefined();
    },
  );
});
