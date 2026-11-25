import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { strings } from '../../../../../locales/i18n';
import { collectiblesTestIds } from '#app/components/UI/Collectibles/Collectibles.testIds';
import { PackCategoryFilter } from '#app/components/UI/Collectibles/components/PackCategoryFilter';

const categories = [
  { id: 'pokemon', name: 'Pokémon' },
  { id: 'sports', name: 'Sports' },
];

describe('PackCategoryFilter', () => {
  it('shows "All" first, then the categories', () => {
    render(<PackCategoryFilter categories={categories} onSelect={jest.fn()} />);

    const chipIds = screen
      .getAllByTestId(/^collectibles-packs-chip-/)
      .map((chip) => chip.props.testID);

    expect(chipIds).toEqual(
      ['all', 'pokemon', 'sports'].map(collectiblesTestIds.packsCategoryChip),
    );
  });

  it('marks "All" as selected when no category is selected', () => {
    render(<PackCategoryFilter categories={categories} onSelect={jest.fn()} />);

    expect(
      screen.getByTestId(collectiblesTestIds.packsCategoryChip('all')),
    ).toBeSelected();
    expect(
      screen.getByTestId(collectiblesTestIds.packsCategoryChip('pokemon')),
    ).not.toBeSelected();
  });

  it('reports the pressed category', () => {
    const onSelect = jest.fn();
    render(
      <PackCategoryFilter
        categories={categories}
        selectedId="pokemon"
        onSelect={onSelect}
      />,
    );

    fireEvent.press(screen.getByText('Sports'));

    expect(onSelect).toHaveBeenCalledWith('sports');
  });

  it('reports no category when "All" is pressed', () => {
    const onSelect = jest.fn();
    render(
      <PackCategoryFilter
        categories={categories}
        selectedId="pokemon"
        onSelect={onSelect}
      />,
    );

    fireEvent.press(screen.getByText(strings('collectibles.packs.all')));

    expect(onSelect).toHaveBeenCalledWith(undefined);
  });
});
