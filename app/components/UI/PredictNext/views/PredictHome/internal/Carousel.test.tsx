const mockFlashListProps = jest.fn();

// Renders every cell at once and records the props of each render.
jest.mock('@shopify/flash-list', () => {
  const { FlashListRenderAll } = jest.requireActual(
    './testUtils/flashListRenderAll',
  );
  return {
    FlashList: (props: FlashListRenderAllProps) => {
      mockFlashListProps(props);
      return FlashListRenderAll(props);
    },
  };
});

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { act, render, screen, within } from '@testing-library/react-native';
import type { ListRenderItem } from '@shopify/flash-list';
import type { FlashListRenderAllProps } from './testUtils/flashListRenderAll';
import { Carousel, type CarouselProps } from './Carousel';

interface Card {
  id: string;
}

const CARDS: Card[] = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
const CARD_WIDTH = 340;

const Skeleton = () => <Text testID="card-skeleton">loading</Text>;
const renderItem: ListRenderItem<Card> = ({ item }) => (
  <Text testID={`card-${item.id}`}>{item.id}</Text>
);

const renderCarousel = (props: Partial<CarouselProps<Card>> = {}) =>
  render(
    <Carousel<Card>
      data={CARDS}
      isLoading={false}
      renderItem={renderItem}
      Skeleton={Skeleton}
      idPrefix="test"
      cardWidth={CARD_WIDTH}
      {...props}
    />,
  );

const cellStyle = (index: number) =>
  StyleSheet.flatten(screen.getByTestId(`test-card-${index}`).props.style);

const lastFlashListProps = () =>
  mockFlashListProps.mock.calls[mockFlashListProps.mock.calls.length - 1][0];

const viewToken = (index: number, isViewable = true) => ({
  item: CARDS[index],
  key: `test-${index}`,
  index,
  isViewable,
  timestamp: 0,
});

describe('Carousel', () => {
  beforeEach(() => {
    mockFlashListProps.mockClear();
  });

  describe('layout', () => {
    it('sizes every card slot at cardWidth plus the 12pt gap, and the last card at cardWidth', () => {
      renderCarousel();

      expect(cellStyle(0)).toMatchObject({
        width: CARD_WIDTH + 12,
        minHeight: 220,
        paddingRight: 12,
        borderRadius: 16,
        overflow: 'hidden',
      });
      expect(cellStyle(1)).toMatchObject({
        width: CARD_WIDTH + 12,
        paddingRight: 12,
      });
      expect(cellStyle(2)).toMatchObject({ width: CARD_WIDTH, minHeight: 220 });
      expect(cellStyle(2).paddingRight).toBeUndefined();
    });

    it('snaps by the card slot in a horizontal list with fast deceleration', () => {
      renderCarousel();

      const props = lastFlashListProps();
      expect(props).toMatchObject({
        horizontal: true,
        pagingEnabled: false,
        showsHorizontalScrollIndicator: false,
        snapToInterval: CARD_WIDTH + 12,
        decelerationRate: 'fast',
        testID: 'test-flash-list',
      });
      expect(StyleSheet.flatten(props.contentContainerStyle)).toEqual({
        paddingLeft: 16,
        paddingRight: 16,
      });
    });

    it('renders the list with no wrapper when no footer is given', () => {
      const { toJSON } = renderCarousel();

      expect(toJSON()).toMatchObject({ props: { testID: 'test-flash-list' } });
    });
  });

  describe('explicit cardWidth and gap', () => {
    it('sizes each card at cardWidth with gap after it and snaps by their sum', () => {
      renderCarousel({ cardWidth: 340, gap: 8 });

      expect(cellStyle(0)).toMatchObject({ width: 348, paddingRight: 8 });
      expect(cellStyle(1)).toMatchObject({ width: 348, paddingRight: 8 });
      expect(cellStyle(2)).toMatchObject({ width: 340 });
      expect(cellStyle(2).paddingRight).toBeUndefined();
      expect(lastFlashListProps().snapToInterval).toBe(348);
    });

    it('uses the 12pt default gap when gap is omitted', () => {
      renderCarousel({ cardWidth: 300 });

      expect(cellStyle(0)).toMatchObject({ width: 312, paddingRight: 12 });
      expect(lastFlashListProps().snapToInterval).toBe(312);
    });
  });

  describe('footer', () => {
    const renderFooter = ({
      activePage,
      totalPages,
    }: {
      activePage: number;
      totalPages: number;
    }) => (
      <View testID="carousel-footer">
        <Text testID="footer-page">{`${activePage}/${totalPages}`}</Text>
      </View>
    );

    it('renders the footer below the list', () => {
      const { toJSON } = renderCarousel({ renderFooter });

      const tree = toJSON();
      const children = tree && !Array.isArray(tree) ? tree.children : null;
      const order = (children ?? []).map((child) =>
        typeof child === 'string' ? child : child.props.testID,
      );
      expect(order).toEqual(['test-flash-list', 'carousel-footer']);
    });

    it('starts on the first page with one page per card', () => {
      renderCarousel({ renderFooter });

      expect(screen.getByTestId('footer-page')).toHaveTextContent('0/3');
    });

    it('counts skeleton pages while loading', () => {
      renderCarousel({ renderFooter, isLoading: true, skeletonCount: 2 });

      expect(screen.getByTestId('footer-page')).toHaveTextContent('0/2');
    });

    it('moves the active page to the first viewable card', () => {
      renderCarousel({ renderFooter });

      act(() => {
        lastFlashListProps().onViewableItemsChanged({
          viewableItems: [viewToken(2), viewToken(1)],
          changed: [],
        });
      });

      expect(screen.getByTestId('footer-page')).toHaveTextContent('1/3');
    });

    it('keeps the active page when no card is viewable', () => {
      renderCarousel({ renderFooter });
      act(() => {
        lastFlashListProps().onViewableItemsChanged({
          viewableItems: [viewToken(2)],
          changed: [],
        });
      });

      act(() => {
        lastFlashListProps().onViewableItemsChanged({
          viewableItems: [],
          changed: [viewToken(2, false)],
        });
      });

      expect(screen.getByTestId('footer-page')).toHaveTextContent('2/3');
    });

    it('clamps the active page when the data shrinks', () => {
      const { rerender } = renderCarousel({ renderFooter });
      act(() => {
        lastFlashListProps().onViewableItemsChanged({
          viewableItems: [viewToken(2)],
          changed: [],
        });
      });

      rerender(
        <Carousel<Card>
          data={CARDS.slice(0, 2)}
          isLoading={false}
          renderItem={renderItem}
          Skeleton={Skeleton}
          idPrefix="test"
          cardWidth={CARD_WIDTH}
          renderFooter={renderFooter}
        />,
      );

      expect(screen.getByTestId('footer-page')).toHaveTextContent('1/2');
    });
  });

  describe('viewability', () => {
    it('counts a card as viewable once half of it is on screen by default', () => {
      renderCarousel();

      expect(lastFlashListProps().viewabilityConfig).toEqual({
        itemVisiblePercentThreshold: 50,
      });
    });

    it('passes a caller viewabilityConfig through to the list', () => {
      const viewabilityConfig = { viewAreaCoveragePercentThreshold: 80 };

      renderCarousel({ viewabilityConfig });

      expect(lastFlashListProps().viewabilityConfig).toBe(viewabilityConfig);
    });
  });

  it('renders a skeleton in every card while loading', () => {
    renderCarousel({ isLoading: true });

    const list = screen.getByTestId('test-flash-list');
    expect(within(list).getAllByTestId('card-skeleton')).toHaveLength(3);
    expect(within(list).queryByTestId('card-a')).not.toBeOnTheScreen();
  });
});
