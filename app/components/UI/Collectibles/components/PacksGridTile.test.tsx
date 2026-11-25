import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { strings } from '../../../../../locales/i18n';
import { collectiblesTestIds } from '#app/components/UI/Collectibles/Collectibles.testIds';
import type { ListedPack } from '#app/components/UI/Collectibles/types/packs';
import { PacksGridTile } from './PacksGridTile';

const pack: ListedPack = {
  code: 'pack-1',
  name: 'Lorem ipsum',
  openedCount: 1234,
  priceUsd: 25,
  isMachineOpen: true,
  categoryId: 'pokemon',
};

function renderTile(overrides: Partial<ListedPack> = {}) {
  const onOpenDetail = jest.fn();
  const onOpenBuy = jest.fn();
  render(
    <PacksGridTile
      pack={{ ...pack, ...overrides }}
      onOpenDetail={onOpenDetail}
      onOpenBuy={onOpenBuy}
    />,
  );
  return { onOpenDetail, onOpenBuy };
}

describe('PacksGridTile', () => {
  it('shows the name, the counter and the USD price button', () => {
    renderTile();

    expect(screen.getByText('Lorem ipsum')).toBeOnTheScreen();
    expect(screen.getByText('1,234')).toBeOnTheScreen();
    expect(
      screen.getByText(
        strings('collectibles.packs.open_price', { price: '$25' }),
      ),
    ).toBeOnTheScreen();
  });

  it('cuts a long name to one line', () => {
    renderTile();

    expect(screen.getByText('Lorem ipsum')).toHaveProp('numberOfLines', 1);
  });

  it.each([
    [19_999, false],
    [20_000, true],
  ])('with %d opens shows the flame: %s', (openedCount, hasFlame) => {
    renderTile({ openedCount });

    expect(
      screen.queryByTestId(collectiblesTestIds.flame(pack.code)) !== null,
    ).toBe(hasFlame);
  });

  it('shows a neutral placeholder when there is no art', () => {
    renderTile();

    expect(
      screen.getByTestId(
        collectiblesTestIds.packsTileArtPlaceholder(pack.code),
      ),
    ).toBeOnTheScreen();
  });

  it('opens the detail from the art, counter and name', () => {
    const { onOpenDetail, onOpenBuy } = renderTile();

    fireEvent.press(screen.getByText('Lorem ipsum'));
    fireEvent.press(screen.getByText('1,234'));
    fireEvent.press(
      screen.getByTestId(
        collectiblesTestIds.packsTileArtPlaceholder(pack.code),
      ),
    );

    expect(onOpenDetail).toHaveBeenCalledTimes(3);
    expect(onOpenDetail).toHaveBeenCalledWith(
      expect.objectContaining({ code: pack.code }),
    );
    expect(onOpenBuy).not.toHaveBeenCalled();
  });

  it('opens the buy flow from the price button', () => {
    const { onOpenDetail, onOpenBuy } = renderTile();

    fireEvent.press(
      screen.getByTestId(collectiblesTestIds.packsTileBuy(pack.code)),
    );

    expect(onOpenBuy).toHaveBeenCalledWith(
      expect.objectContaining({ code: pack.code }),
    );
    expect(onOpenDetail).not.toHaveBeenCalled();
  });
});
