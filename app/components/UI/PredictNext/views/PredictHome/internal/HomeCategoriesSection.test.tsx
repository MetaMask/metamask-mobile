import React from 'react';
import { StyleSheet } from 'react-native';
import {
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react-native';
import { lightTheme } from '@metamask/design-tokens';
import { HomeCategoriesSection } from './HomeCategoriesSection';
import { PredictHomeTestIds } from '../PredictHome.testIds';

// Every Category in the design, as if each had a Feed on the Active Venue.
const ALL_CATEGORIES = [
  { id: 'politics', label: 'Politics' },
  { id: 'sports', label: 'Sports' },
  { id: 'crypto', label: 'Crypto' },
  { id: 'esports', label: 'E-sports' },
  { id: 'weather', label: 'Weather' },
  { id: 'finance', label: 'Finance' },
  { id: 'tech', label: 'Tech' },
];

const renderSection = (
  props: Partial<React.ComponentProps<typeof HomeCategoriesSection>> = {},
) =>
  render(
    <HomeCategoriesSection
      title="Categories"
      categories={ALL_CATEGORIES}
      onSelect={jest.fn()}
      {...props}
    />,
  );

describe('HomeCategoriesSection', () => {
  it('renders the header and every chip in order on a wrapping row', () => {
    renderSection();

    expect(
      screen.getByTestId(PredictHomeTestIds.CATEGORIES_HEADER),
    ).toHaveTextContent('Categories');
    const list = screen.getByTestId(PredictHomeTestIds.CATEGORIES_LIST);
    expect(StyleSheet.flatten(list.props.style)).toMatchObject({
      flexDirection: 'row',
      flexWrap: 'wrap',
    });
    const chips = within(list).getAllByRole('button');
    expect(chips.map((chip) => chip.props.testID)).toEqual(
      ALL_CATEGORIES.map(({ id }) => PredictHomeTestIds.categoryChip(id)),
    );
    chips.forEach((chip, index) =>
      expect(chip).toHaveTextContent(ALL_CATEGORIES[index].label),
    );
  });

  it('draws each chip 40pt tall on the muted fill', () => {
    renderSection();

    expect(
      screen.getByTestId(PredictHomeTestIds.categoryChip('politics')),
    ).toHaveStyle({
      height: 40,
      backgroundColor: lightTheme.colors.background.muted,
    });
  });

  it('reports the pressed Category', () => {
    const onSelect = jest.fn();
    renderSection({ onSelect });

    fireEvent.press(
      screen.getByTestId(PredictHomeTestIds.categoryChip('crypto')),
    );

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith('crypto');
  });

  it('gives the header no press action', () => {
    renderSection();

    expect(
      screen.queryByRole('button', { name: /categories/i }),
    ).not.toBeOnTheScreen();
  });

  it('renders nothing without a Category to show', () => {
    renderSection({ categories: [] });

    expect(
      screen.queryByTestId(PredictHomeTestIds.CATEGORIES),
    ).not.toBeOnTheScreen();
  });
});
