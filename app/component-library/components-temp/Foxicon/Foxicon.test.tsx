import React from 'react';
import { render, screen } from '@testing-library/react-native';

import Foxicon from './Foxicon';
import { assetByFoxiconVariant } from './Foxicon.assets';
import { FoxiconSelectorsIDs } from './Foxicon.testIds';
import { FoxiconVariant } from './Foxicon.types';

describe('Foxicon', () => {
  it('renders the fox illustration', () => {
    render(<Foxicon variant={FoxiconVariant.Base} size={48} />);

    expect(screen.getByTestId(FoxiconSelectorsIDs.CONTAINER)).toBeOnTheScreen();
  });

  it('applies size to width and height', () => {
    render(<Foxicon variant={FoxiconVariant.Agent} size={64} />);

    const foxicon = screen.getByTestId(FoxiconSelectorsIDs.CONTAINER);
    expect(foxicon.props.width).toBe(64);
    expect(foxicon.props.height).toBe(64);
  });

  it('renders the asset for the given variant', () => {
    render(<Foxicon variant={FoxiconVariant.Zombie} size={32} />);

    expect(screen.getByTestId(FoxiconSelectorsIDs.CONTAINER).props.name).toBe(
      FoxiconVariant.Zombie,
    );
  });

  it('uses a custom testID when provided', () => {
    const customTestId = 'custom-foxicon';

    render(
      <Foxicon
        variant={FoxiconVariant.Pirate}
        size={32}
        testID={customTestId}
      />,
    );

    expect(screen.getByTestId(customTestId)).toBeOnTheScreen();
  });

  it.each(Object.values(FoxiconVariant))(
    'has an asset for the %s variant',
    (variant) => {
      expect(assetByFoxiconVariant[variant]).toBeDefined();
    },
  );
});
