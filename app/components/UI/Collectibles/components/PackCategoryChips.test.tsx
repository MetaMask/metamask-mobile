import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { strings } from '../../../../../locales/i18n';
import { collectiblesTestIds } from '#app/components/UI/Collectibles/Collectibles.testIds';
import { PackCategoryChips } from './PackCategoryChips';

const categories = [
  { id: 'pokemon', name: 'Pokémon' },
  { id: 'sports', name: 'Sports' },
];

describe('PackCategoryChips', () => {
  it('shows "All" first, then the categories', () => {
    render(<PackCategoryChips categories={categories} onSelect={jest.fn()} />);

    expect(
      screen.getByText(strings('collectibles.packs.all')),
    ).toBeOnTheScreen();
    expect(screen.getByText('Pokémon')).toBeOnTheScreen();
    expect(screen.getByText('Sports')).toBeOnTheScreen();
  });

  it('marks "All" as selected when no category is selected', () => {
    render(<PackCategoryChips categories={categories} onSelect={jest.fn()} />);

    expect(
      screen.getByTestId(collectiblesTestIds.packsCategoryChip('all')),
    ).toBeSelected();
    expect(
      screen.getByTestId(collectiblesTestIds.packsCategoryChip('pokemon')),
    ).not.toBeSelected();
  });

  it('reports the pressed chip', () => {
    const onSelect = jest.fn();
    render(
      <PackCategoryChips
        categories={categories}
        selectedId="pokemon"
        onSelect={onSelect}
      />,
    );

    fireEvent.press(screen.getByText('Sports'));
    fireEvent.press(screen.getByText(strings('collectibles.packs.all')));

    expect(onSelect).toHaveBeenNthCalledWith(1, 'sports');
    expect(onSelect).toHaveBeenNthCalledWith(2, undefined);
  });
});
