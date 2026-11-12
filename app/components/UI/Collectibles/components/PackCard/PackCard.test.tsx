import React from 'react';
import { useWindowDimensions } from 'react-native';
import { fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { CollectiblesPackCardTestIds } from '../../Collectibles.testIds';
import { createPack } from '../../views/testUtils';
import PackCard from './PackCard';

jest.mock('../../assets/named-packs/pokemon-core.webp', () => 12);
jest.mock('../../assets/named-packs/pokemon-charged.webp', () => 22);
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: jest.fn(() => ({ width: 390, height: 844, scale: 3, fontScale: 1 })),
}));

const PACK = createPack();

describe('PackCard', () => {
  beforeEach(() => {
    jest.mocked(useWindowDimensions).mockReturnValue({
      width: 390,
      height: 844,
      scale: 3,
      fontScale: 1,
    });
  });

  it('renders the artwork, title and numeric price', () => {
    renderWithProvider(<PackCard pack={PACK} onOpen={jest.fn()} />);

    expect(screen.getByText('Pokémon Charged Pack')).toBeOnTheScreen();
    expect(
      screen.getByTestId(CollectiblesPackCardTestIds.IMAGE(PACK.code)),
    ).toHaveProp('source', 22);
    expect(screen.getByText('50')).toBeOnTheScreen();
    expect(
      screen.getByLabelText('Pokémon Charged Pack, 50 USDC'),
    ).toBeOnTheScreen();
    expect(screen.queryByText('50 USDC')).not.toBeOnTheScreen();
  });

  it('uses the default artwork and API name for an unknown pack', () => {
    const pack = createPack({
      code: 'new-pack',
      name: 'New Collector Pack',
      category: 'Unknown',
    });
    renderWithProvider(<PackCard pack={pack} onOpen={jest.fn()} />);

    expect(screen.getByText(pack.name)).toBeOnTheScreen();
    expect(
      screen.getByTestId(CollectiblesPackCardTestIds.IMAGE(pack.code)),
    ).toHaveProp('source', 12);
  });

  it('keeps a single title line when longer metadata arrives', () => {
    const pack = createPack({ code: 'new-pack', name: 'Pack' });
    const { rerender } = renderWithProvider(
      <PackCard pack={pack} onOpen={jest.fn()} />,
    );
    const title = screen.getByTestId(`collectibles-pack-title-${pack.code}`);
    expect(title).toHaveProp('numberOfLines', 1);
    expect(title).toHaveStyle({ minHeight: 22 });

    rerender(
      <PackCard
        pack={{
          ...pack,
          name: 'A long published pack title with more than one line of copy',
        }}
        onOpen={jest.fn()}
      />,
    );

    expect(
      screen.getByTestId(`collectibles-pack-title-${pack.code}`),
    ).toHaveProp('numberOfLines', 1);
    expect(
      screen.getByTestId(`collectibles-pack-title-${pack.code}`),
    ).toHaveStyle({ minHeight: 22 });
  });

  it('opens pack details without checking the balance', () => {
    const onOpen = jest.fn();
    renderWithProvider(<PackCard pack={PACK} onOpen={onOpen} />);

    fireEvent.press(
      screen.getByTestId(CollectiblesPackCardTestIds.CARD(PACK.code)),
    );

    expect(onOpen).toHaveBeenCalledWith(PACK);
  });

  it('keeps the preview and the direct Open action separate', () => {
    const onOpen = jest.fn();
    const onBuy = jest.fn();
    const stopPropagation = jest.fn();
    renderWithProvider(
      <PackCard pack={PACK} onOpen={onOpen} onBuy={onBuy} variant="carousel" />,
    );
    expect(screen.getByText('Open · $50')).toBeOnTheScreen();
    expect(screen.queryByText('Pokemon')).not.toBeOnTheScreen();
    expect(screen.queryByText('50')).not.toBeOnTheScreen();
    fireEvent.press(
      screen.getByTestId(CollectiblesPackCardTestIds.CARD(PACK.code)),
    );
    expect(onOpen).toHaveBeenCalledWith(PACK);
    expect(onBuy).not.toHaveBeenCalled();
    onOpen.mockClear();
    fireEvent.press(
      screen.getByTestId(CollectiblesPackCardTestIds.OPEN_BUTTON(PACK.code)),
      { stopPropagation },
    );
    expect(stopPropagation).toHaveBeenCalled();
    expect(onBuy).toHaveBeenCalledWith(PACK);
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('blocks opening a disabled pack preview', () => {
    const onOpen = jest.fn();
    const { rerender } = renderWithProvider(
      <PackCard pack={PACK} onOpen={onOpen} isDisabled />,
    );
    const button = screen.getByTestId(
      CollectiblesPackCardTestIds.CARD(PACK.code),
    );

    fireEvent.press(button);

    expect(button).toBeDisabled();
    expect(onOpen).not.toHaveBeenCalled();

    rerender(<PackCard pack={PACK} onOpen={onOpen} isDisabled={false} />);
    fireEvent.press(button);

    expect(button).toBeEnabled();
    expect(onOpen).toHaveBeenCalledWith(PACK);
  });

  it('only shows the supplied seven-day count and updates it when the tile is reused', () => {
    const { rerender } = renderWithProvider(
      <PackCard
        pack={PACK}
        onOpen={jest.fn()}
        variant="compact"
        openedLast7d={1234}
      />,
    );
    expect(
      screen.getByLabelText('1234 opened in the last 7 days'),
    ).toBeOnTheScreen();
    rerender(<PackCard pack={PACK} onOpen={jest.fn()} variant="compact" />);
    expect(
      screen.queryByTestId(`collectibles-pack-opened-${PACK.code}`),
    ).not.toBeOnTheScreen();
  });

  it.each(['compact', 'carousel'] as const)(
    'updates the artwork and purchase callback when a %s cell is recycled',
    (variant) => {
      const onOpen = jest.fn();
      const nextOnOpen = jest.fn();
      const nextPack = createPack({ code: 'pokemon_25', price: 25 });
      const { rerender } = renderWithProvider(
        <PackCard pack={PACK} onOpen={onOpen} variant={variant} />,
      );

      rerender(
        <PackCard pack={nextPack} onOpen={nextOnOpen} variant={variant} />,
      );
      fireEvent.press(
        screen.getByTestId(CollectiblesPackCardTestIds.CARD(nextPack.code)),
      );

      expect(screen.getByText('Pokémon Core Pack')).toBeOnTheScreen();
      expect(
        screen.getByTestId(CollectiblesPackCardTestIds.IMAGE(nextPack.code)),
      ).toHaveProp('source', 12);
      expect(
        screen.queryByTestId(CollectiblesPackCardTestIds.IMAGE(PACK.code)),
      ).not.toBeOnTheScreen();
      expect(nextOnOpen).toHaveBeenCalledWith(nextPack);
      expect(onOpen).not.toHaveBeenCalled();
    },
  );
});
