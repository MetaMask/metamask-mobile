import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { GachaPackCardTestIds } from '../../Gacha.testIds';
import { createPack } from '../../views/testUtils';
import PackCard from './PackCard';

jest.mock('../../assets/pack-artwork/pokemon-25-ember-list.webp', () => 12);
jest.mock('../../assets/pack-artwork/pokemon-50-spark-list.webp', () => 22);
jest.mock('../../assets/pack-artwork/default-origin-list.webp', () => 32);

const PACK = createPack();

describe('PackCard', () => {
  it('renders the artwork, title, numeric price and Open CTA', () => {
    renderWithProvider(
      <PackCard pack={PACK} isAffordable onOpen={jest.fn()} />,
    );

    expect(screen.getByText('Pokémon Spark')).toBeOnTheScreen();
    expect(
      screen.getByTestId(GachaPackCardTestIds.IMAGE(PACK.code)),
    ).toHaveProp('source', 22);
    expect(screen.getByText('50')).toBeOnTheScreen();
    expect(screen.getByLabelText('50 USDC')).toBeOnTheScreen();
    expect(screen.queryByText('50 USDC')).not.toBeOnTheScreen();
    expect(screen.getByText('Open')).toBeOnTheScreen();
    expect(screen.queryByText(/instant buyback/u)).not.toBeOnTheScreen();
    expect(screen.queryByText(/Cards up to/u)).not.toBeOnTheScreen();
    expect(screen.queryByText(/Common/u)).not.toBeOnTheScreen();
  });

  it('uses Origin and the API name for an unknown pack', () => {
    const pack = createPack({ code: 'new-pack', name: 'New Collector Pack' });
    renderWithProvider(
      <PackCard pack={pack} isAffordable onOpen={jest.fn()} />,
    );

    expect(screen.getByText(pack.name)).toBeOnTheScreen();
    expect(
      screen.getByTestId(GachaPackCardTestIds.IMAGE(pack.code)),
    ).toHaveProp('source', 32);
  });

  it('calls onOpen with the pack when affordable', () => {
    const onOpen = jest.fn();
    renderWithProvider(<PackCard pack={PACK} isAffordable onOpen={onOpen} />);

    fireEvent.press(
      screen.getByTestId(GachaPackCardTestIds.OPEN_BUTTON(PACK.code)),
    );

    expect(onOpen).toHaveBeenCalledWith(PACK);
  });

  it('disables the CTA when the balance is too low', () => {
    const onOpen = jest.fn();
    renderWithProvider(
      <PackCard pack={PACK} isAffordable={false} onOpen={onOpen} />,
    );
    const button = screen.getByTestId(
      GachaPackCardTestIds.OPEN_BUTTON(PACK.code),
    );

    fireEvent.press(button);

    expect(button).toBeDisabled();
    expect(onOpen).not.toHaveBeenCalled();
    expect(screen.queryByText('Not enough USDC')).not.toBeOnTheScreen();
  });

  it('updates the artwork and purchase callback when a cell is recycled', () => {
    const onOpen = jest.fn();
    const nextOnOpen = jest.fn();
    const nextPack = createPack({ code: 'pokemon_25', price: 25 });
    const { rerender } = renderWithProvider(
      <PackCard pack={PACK} isAffordable onOpen={onOpen} />,
    );

    rerender(<PackCard pack={nextPack} isAffordable onOpen={nextOnOpen} />);
    fireEvent.press(
      screen.getByTestId(GachaPackCardTestIds.OPEN_BUTTON(nextPack.code)),
    );

    expect(screen.getByText('Pokémon Ember')).toBeOnTheScreen();
    expect(
      screen.getByTestId(GachaPackCardTestIds.IMAGE(nextPack.code)),
    ).toHaveProp('source', 12);
    expect(
      screen.queryByTestId(GachaPackCardTestIds.IMAGE(PACK.code)),
    ).not.toBeOnTheScreen();
    expect(nextOnOpen).toHaveBeenCalledWith(nextPack);
    expect(onOpen).not.toHaveBeenCalled();
  });
});
