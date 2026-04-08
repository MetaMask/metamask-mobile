import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import SectionHorizontalScroll from './SectionHorizontalScroll';
import type { SectionId } from '../../../sections.config';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

const MockRowItem = jest.fn(({ item }: { item: unknown }) => {
  const ReactNative = jest.requireActual('react-native');
  const market = item as { symbol: string };
  return (
    <ReactNative.View testID={`row-item-${market.symbol}`}>
      <ReactNative.Text>{market.symbol}</ReactNative.Text>
    </ReactNative.View>
  );
});

const MockSkeleton = jest.fn(() => {
  const ReactNative = jest.requireActual('react-native');
  return <ReactNative.View testID="mock-skeleton" />;
});

const mockViewAllAction = jest.fn();

jest.mock('../../../sections.config', () => ({
  SECTIONS_CONFIG: {
    perps: {
      id: 'perps',
      title: 'Perps',
      RowItem: (...args: unknown[]) => MockRowItem(...(args as [never])),
      Skeleton: () => MockSkeleton(),
      viewAllAction: (...args: unknown[]) =>
        mockViewAllAction(...(args as [never])),
    },
  },
}));

jest.mock('../../../../Homepage/components/ViewMoreCard', () => {
  const ReactNative = jest.requireActual('react-native');
  return ({ onPress, testID }: { onPress: () => void; testID?: string }) => (
    <ReactNative.TouchableOpacity onPress={onPress} testID={testID}>
      <ReactNative.Text>View more</ReactNative.Text>
    </ReactNative.TouchableOpacity>
  );
});

const createMarkets = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    symbol: `MKT${i}`,
    name: `Market ${i}`,
  }));

describe('SectionHorizontalScroll', () => {
  const sectionId: SectionId = 'perps';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders skeleton when loading', () => {
    render(
      <SectionHorizontalScroll sectionId={sectionId} data={[]} isLoading />,
    );

    expect(screen.getByTestId('mock-skeleton')).toBeOnTheScreen();
    expect(screen.queryByTestId('homepage-trending-perps-carousel')).toBeNull();
  });

  it('renders items and ViewMoreCard when not loading', () => {
    const data = createMarkets(3);

    render(
      <SectionHorizontalScroll
        sectionId={sectionId}
        data={data}
        isLoading={false}
      />,
    );

    expect(
      screen.getByTestId('homepage-trending-perps-carousel'),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('row-item-MKT0')).toBeOnTheScreen();
    expect(screen.getByTestId('row-item-MKT1')).toBeOnTheScreen();
    expect(screen.getByTestId('row-item-MKT2')).toBeOnTheScreen();
    expect(screen.getByTestId('perps-view-more-card')).toBeOnTheScreen();
  });

  it('limits displayed items to 5', () => {
    const data = createMarkets(8);

    render(
      <SectionHorizontalScroll
        sectionId={sectionId}
        data={data}
        isLoading={false}
      />,
    );

    expect(screen.getByTestId('row-item-MKT0')).toBeOnTheScreen();
    expect(screen.getByTestId('row-item-MKT4')).toBeOnTheScreen();
    expect(screen.queryByTestId('row-item-MKT5')).toBeNull();
    expect(screen.queryByTestId('row-item-MKT7')).toBeNull();
  });

  it('calls viewAllAction when ViewMoreCard is pressed', () => {
    const data = createMarkets(2);

    render(
      <SectionHorizontalScroll
        sectionId={sectionId}
        data={data}
        isLoading={false}
      />,
    );

    fireEvent.press(screen.getByTestId('perps-view-more-card'));

    expect(mockViewAllAction).toHaveBeenCalledTimes(1);
  });

  it('renders empty scroll with only ViewMoreCard when data is empty', () => {
    render(
      <SectionHorizontalScroll
        sectionId={sectionId}
        data={[]}
        isLoading={false}
      />,
    );

    expect(
      screen.getByTestId('homepage-trending-perps-carousel'),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('perps-view-more-card')).toBeOnTheScreen();
    expect(MockRowItem).not.toHaveBeenCalled();
  });
});
