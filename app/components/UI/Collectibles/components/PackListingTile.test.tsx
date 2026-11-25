import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { strings } from '../../../../../locales/i18n';
import { collectiblesTestIds } from '#app/components/UI/Collectibles/Collectibles.testIds';
import type { ListedPack } from '#app/components/UI/Collectibles/types/packs';
import { PackListingTile } from '#app/components/UI/Collectibles/components/PackListingTile';

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
    <PackListingTile
      pack={{ ...pack, ...overrides }}
      onOpenDetail={onOpenDetail}
      onOpenBuy={onOpenBuy}
    />,
  );
  return { onOpenDetail, onOpenBuy };
}

const opensLabel = strings('collectibles.home.opens', {
  count: 1234,
  formattedCount: '1,234',
});

describe('PackListingTile', () => {
  it('shows the pack summary', () => {
    renderTile();

    expect(screen.getByText('Lorem ipsum')).toBeOnTheScreen();
    expect(screen.getByText('1,234')).toBeOnTheScreen();
    expect(
      screen.getByText(
        strings('collectibles.packs.open_price', { price: '$25.00' }),
      ),
    ).toBeOnTheScreen();
  });

  it('cuts a long name to one line', () => {
    renderTile();

    expect(screen.getByText('Lorem ipsum')).toHaveProp('numberOfLines', 1);
  });

  it('shows the flame from 20,000 opens', () => {
    renderTile({ openedCount: 20_000 });

    expect(
      screen.getByTestId(collectiblesTestIds.flame(pack.code)),
    ).toBeOnTheScreen();
  });

  it('hides the flame below 20,000 opens', () => {
    renderTile({ openedCount: 19_999 });

    expect(
      screen.queryByTestId(collectiblesTestIds.flame(pack.code)),
    ).not.toBeOnTheScreen();
  });

  it('labels the tile with the name plus opens', () => {
    renderTile();

    expect(
      screen.getByLabelText(
        strings('collectibles.packs.tile_label', {
          name: 'Lorem ipsum',
          opens: opensLabel,
        }),
      ),
    ).toBeOnTheScreen();
  });

  it('keeps the counter out of the screen reader order', () => {
    renderTile();

    expect(screen.queryByLabelText(opensLabel)).not.toBeOnTheScreen();
  });

  it('names the pack on the price button', () => {
    renderTile();

    expect(
      screen.getByLabelText(
        strings('collectibles.packs.open_pack_price', {
          name: 'Lorem ipsum',
          price: '$25.00',
        }),
      ),
    ).toBeOnTheScreen();
  });

  it('shows the art of a new pack after the previous art failed', () => {
    const handlers = { onOpenDetail: jest.fn(), onOpenBuy: jest.fn() };
    render(
      <PackListingTile
        pack={{ ...pack, imageUrl: 'https://example.com/a.png' }}
        {...handlers}
      />,
    );
    fireEvent(
      screen.getByTestId(collectiblesTestIds.packsTileArt(pack.code)),
      'error',
    );
    expect(
      screen.getByTestId(
        collectiblesTestIds.packsTileArtPlaceholder(pack.code),
      ),
    ).toBeOnTheScreen();

    screen.rerender(
      <PackListingTile
        pack={{
          ...pack,
          code: 'pack-2',
          imageUrl: 'https://example.com/b.png',
        }}
        {...handlers}
      />,
    );

    expect(
      screen.getByTestId(collectiblesTestIds.packsTileArt('pack-2')),
    ).toBeOnTheScreen();
  });

  it('shows a neutral placeholder when there is no art', () => {
    renderTile();

    expect(
      screen.getByTestId(
        collectiblesTestIds.packsTileArtPlaceholder(pack.code),
      ),
    ).toBeOnTheScreen();
  });

  it.each([
    ['name', () => screen.getByText('Lorem ipsum')],
    ['counter', () => screen.getByText('1,234')],
    [
      'art',
      () =>
        screen.getByTestId(
          collectiblesTestIds.packsTileArtPlaceholder(pack.code),
        ),
    ],
  ])('opens the detail from the %s', (_target, getTarget) => {
    const { onOpenDetail, onOpenBuy } = renderTile();

    fireEvent.press(getTarget());

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
