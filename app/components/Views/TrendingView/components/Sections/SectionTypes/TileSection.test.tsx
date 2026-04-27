import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import TileSection from './TileSection';
import { SECTIONS_CONFIG } from '../../../sections.config';

const mockUseTileExtra = jest.fn((_items: unknown[]) => ({}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), dispatch: jest.fn() }),
}));

jest.mock('../../../sections.config', () => {
  const { View, Text } =
    jest.requireActual<typeof import('react-native')>('react-native');
  const viewAllAction = jest.fn();
  return {
    SECTIONS_CONFIG: {
      perps: {
        id: 'perps',
        getItemIdentifier: (item: { symbol: string }) => item.symbol,
        useTileExtra: (items: unknown[]) => mockUseTileExtra(items),
        RowItem: ({
          item,
        }: {
          item: unknown;
          index: number;
          navigation: unknown;
          extra: unknown;
        }) => (
          <View testID={`tile-${(item as { symbol: string }).symbol}`}>
            <Text>{(item as { symbol: string }).symbol}</Text>
          </View>
        ),
        Skeleton: () => <View testID="mock-skeleton" />,
        viewAllAction,
      },
    },
  };
});

const mockViewAllAction = SECTIONS_CONFIG.perps.viewAllAction as jest.Mock;

jest.mock('../../../../Homepage/components/ViewMoreCard', () => {
  const ReactNative = jest.requireActual('react-native');
  return ({ onPress, testID }: { onPress: () => void; testID?: string }) => (
    <ReactNative.TouchableOpacity onPress={onPress} testID={testID}>
      <ReactNative.Text>View more</ReactNative.Text>
    </ReactNative.TouchableOpacity>
  );
});

const createItems = (count: number) =>
  Array.from({ length: count }, (_, i) => ({ symbol: `MKT${i}` }));

describe('TileSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTileExtra.mockReturnValue({});
  });

  it('renders skeleton when loading', () => {
    render(<TileSection sectionId="perps" data={[]} isLoading />);

    expect(screen.getByTestId('mock-skeleton')).toBeOnTheScreen();
    expect(screen.queryByTestId('explore-perps-carousel')).toBeNull();
  });

  it('renders items and ViewMoreCard when not loading', () => {
    render(
      <TileSection sectionId="perps" data={createItems(3)} isLoading={false} />,
    );

    expect(screen.getByTestId('explore-perps-carousel')).toBeOnTheScreen();
    expect(screen.getByTestId('tile-MKT0')).toBeOnTheScreen();
    expect(screen.getByTestId('tile-MKT1')).toBeOnTheScreen();
    expect(screen.getByTestId('tile-MKT2')).toBeOnTheScreen();
    expect(screen.getByTestId('perps-view-more-card')).toBeOnTheScreen();
  });

  it('limits displayed items to 5', () => {
    render(
      <TileSection sectionId="perps" data={createItems(8)} isLoading={false} />,
    );

    expect(screen.getByTestId('tile-MKT4')).toBeOnTheScreen();
    expect(screen.queryByTestId('tile-MKT5')).toBeNull();
  });

  it('calls viewAllAction when ViewMoreCard is pressed', () => {
    render(
      <TileSection sectionId="perps" data={createItems(2)} isLoading={false} />,
    );

    fireEvent.press(screen.getByTestId('perps-view-more-card'));

    expect(mockViewAllAction).toHaveBeenCalled();
  });

  it('renders only ViewMoreCard when data is empty', () => {
    render(<TileSection sectionId="perps" data={[]} isLoading={false} />);

    expect(screen.getByTestId('explore-perps-carousel')).toBeOnTheScreen();
    expect(screen.getByTestId('perps-view-more-card')).toBeOnTheScreen();
  });

  it('slices data to 5 items before passing to useTileExtra', () => {
    const data = createItems(8);
    render(<TileSection sectionId="perps" data={data} isLoading={false} />);

    expect(mockUseTileExtra).toHaveBeenCalledWith(data.slice(0, 5));
  });
});
