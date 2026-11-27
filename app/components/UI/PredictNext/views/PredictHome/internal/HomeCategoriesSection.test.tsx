import React from 'react';
import { StyleSheet } from 'react-native';
import {
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react-native';
import { IconName } from '@metamask/design-system-react-native';
import { Theme, ThemeProvider } from '@metamask/design-system-twrnc-preset';
import { darkTheme, lightTheme } from '@metamask/design-tokens';
import {
  HomeCategoriesSection,
  splitHomeCategoryRows,
  type HomeCategoryChip,
} from './HomeCategoriesSection';
import { PredictHomeTestIds } from '../PredictHome.testIds';

// The design's V1 Categories, in its order.
const ALL_CATEGORIES: HomeCategoryChip[] = [
  { id: 'trending', label: 'Trending', icon: 'TrendUp' },
  { id: 'football', label: 'Football', icon: 'Football' },
  { id: 'basketball', label: 'Basketball', icon: 'Basketball' },
  { id: 'finance', label: 'Finance', icon: 'Cash' },
  { id: 'politics', label: 'Politics', icon: 'Global' },
  { id: 'culture', label: 'Culture', icon: 'Microphone' },
  { id: 'tech', label: 'Tech' },
];

const rowChipIds = (rowIndex: number) =>
  within(screen.getByTestId(PredictHomeTestIds.categoryRow(rowIndex)))
    .getAllByRole('button')
    .map((chip) => chip.props.testID);

const renderSection = (
  props: Partial<React.ComponentProps<typeof HomeCategoriesSection>> = {},
) =>
  render(
    <HomeCategoriesSection
      categories={ALL_CATEGORIES}
      onSelect={jest.fn()}
      {...props}
    />,
  );

describe('HomeCategoriesSection', () => {
  it('renders seven chips in order as four then three, in two rows of one horizontal scroll with no header', () => {
    renderSection();

    expect(
      within(screen.getByTestId(PredictHomeTestIds.CATEGORIES)).queryByRole(
        'header',
      ),
    ).not.toBeOnTheScreen();
    const list = screen.getByTestId(PredictHomeTestIds.CATEGORIES_LIST);
    expect(list).toHaveProp('horizontal', true);
    expect(StyleSheet.flatten(list.props.contentContainerStyle)).toMatchObject({
      flexDirection: 'column',
      gap: 8,
      paddingLeft: 16,
      paddingRight: 16,
    });
    expect(
      StyleSheet.flatten(
        screen.getByTestId(PredictHomeTestIds.categoryRow(0)).props.style,
      ),
    ).toMatchObject({ flexDirection: 'row', gap: 8 });
    expect(rowChipIds(0)).toEqual(
      ['trending', 'football', 'basketball', 'finance'].map(
        PredictHomeTestIds.categoryChip,
      ),
    );
    expect(rowChipIds(1)).toEqual(
      ['politics', 'culture', 'tech'].map(PredictHomeTestIds.categoryChip),
    );
    within(list)
      .getAllByRole('button')
      .forEach((chip, index) =>
        expect(chip).toHaveTextContent(ALL_CATEGORIES[index].label),
      );
  });

  it('spans the screen edge to edge so the rows run off the right edge', () => {
    renderSection();

    expect(screen.getByTestId(PredictHomeTestIds.CATEGORIES)).toHaveStyle({
      marginLeft: -16,
      marginRight: -16,
    });
  });

  it('renders a single chip on one row, without an empty second row', () => {
    renderSection({ categories: ALL_CATEGORIES.slice(0, 1) });

    expect(rowChipIds(0)).toEqual([
      PredictHomeTestIds.categoryChip('trending'),
    ]);
    expect(
      screen.queryByTestId(PredictHomeTestIds.categoryRow(1)),
    ).not.toBeOnTheScreen();
  });

  it.each([
    [1, 1, 0],
    [2, 1, 1],
    [3, 2, 1],
    [4, 2, 2],
    [5, 3, 2],
    [6, 3, 3],
    [7, 4, 3],
    [8, 4, 4],
  ])(
    'splits %i chips into %i on the first row and %i on the second',
    (count, firstRowLength, secondRowLength) => {
      const chips = Array.from({ length: count }, (_, index) => index);

      const [first, second] = splitHomeCategoryRows(chips);

      expect(first).toHaveLength(firstRowLength);
      expect(second).toHaveLength(secondRowLength);
      expect([...first, ...second]).toEqual(chips);
    },
  );

  it.each([
    [
      'the catalog icon when it names a design-system icon',
      'trending',
      IconName.TrendUp,
    ],
    [
      'the app map when the catalog icon is not a design-system icon',
      'culture',
      IconName.StarFilled,
    ],
    ['the app map when the Feed Screen has no icon', 'tech', IconName.Monitor],
  ] as const)('draws %s', (_case, categoryId, expectedIcon) => {
    renderSection();

    expect(
      screen.getByTestId(PredictHomeTestIds.categoryChipIcon(categoryId)),
    ).toHaveProp('name', expectedIcon);
  });

  it('draws the catalog icon even when it differs from the app map', () => {
    renderSection({
      categories: [{ id: 'politics', label: 'Politics', icon: 'Bank' }],
    });

    expect(
      screen.getByTestId(PredictHomeTestIds.categoryChipIcon('politics')),
    ).toHaveProp('name', IconName.Bank);
  });

  it.each([
    ['no catalog icon', undefined],
    ['an unknown catalog icon', 'Microphone'],
  ])(
    'falls back to Explore for an unmapped Category with %s',
    (_case, icon) => {
      renderSection({
        categories: [{ id: 'weather', label: 'Weather', icon }],
      });

      expect(
        screen.getByTestId(PredictHomeTestIds.categoryChipIcon('weather')),
      ).toHaveProp('name', IconName.Explore);
    },
  );

  it('draws each pill chip 40pt min-height on elevated1 with muted border and 12pt horizontal padding', () => {
    renderSection();

    expect(
      screen.getByTestId(PredictHomeTestIds.categoryChip('politics')),
    ).toHaveStyle({
      minHeight: 40,
      borderRadius: 9999,
      borderWidth: 1,
      borderColor: lightTheme.colors.border.muted,
      backgroundColor: lightTheme.colors.background.elevated1,
      paddingLeft: 12,
      paddingRight: 12,
      gap: 6,
    });
  });

  it('draws dark theme elevated1 surface and muted border in dark mode', () => {
    render(
      <ThemeProvider theme={Theme.Dark}>
        <HomeCategoriesSection
          categories={ALL_CATEGORIES}
          onSelect={jest.fn()}
        />
      </ThemeProvider>,
    );

    expect(
      screen.getByTestId(PredictHomeTestIds.categoryChip('politics')),
    ).toHaveStyle({
      backgroundColor: darkTheme.colors.background.elevated1,
      borderColor: darkTheme.colors.border.muted,
    });
  });

  it('renders a 16pt default-colored icon and BodySm Regular label on each chip', () => {
    renderSection();

    const politicsIcon = screen.getByTestId(
      PredictHomeTestIds.categoryChipIcon('politics'),
    );
    expect(politicsIcon).toHaveProp('name', IconName.Global);
    expect(StyleSheet.flatten(politicsIcon.props.style)).toMatchObject({
      width: 16,
      height: 16,
      color: lightTheme.colors.icon.default,
    });
    expect(
      within(
        screen.getByTestId(PredictHomeTestIds.categoryChip('politics')),
      ).getByText('Politics'),
    ).toHaveStyle({
      fontSize: 14,
      lineHeight: 22,
      color: lightTheme.colors.text.default,
    });
  });

  it('applies the muted pressed fill while pressed', () => {
    renderSection();
    const chip = screen.getByTestId(
      PredictHomeTestIds.categoryChip('football'),
    );

    fireEvent(chip, 'responderGrant', {
      persist: jest.fn(),
      nativeEvent: {
        locationX: 0,
        locationY: 0,
        pageX: 0,
        pageY: 0,
        timestamp: 0,
        touches: [],
        changedTouches: [],
      },
    });

    expect(chip).toHaveStyle({
      backgroundColor: lightTheme.colors.background.mutedPressed,
    });
  });

  it('reports the pressed Category', () => {
    const onSelect = jest.fn();
    renderSection({ onSelect });

    fireEvent.press(
      screen.getByTestId(PredictHomeTestIds.categoryChip('tech')),
    );

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith('tech');
  });

  it('renders nothing without a Category to show', () => {
    renderSection({ categories: [] });

    expect(
      screen.queryByTestId(PredictHomeTestIds.CATEGORIES),
    ).not.toBeOnTheScreen();
  });
});
