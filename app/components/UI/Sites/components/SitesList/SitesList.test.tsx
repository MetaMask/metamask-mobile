import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import SitesList from './SitesList';
import { useNavigation } from '@react-navigation/native';
import type { SiteData } from '../SiteRowItem/SiteRowItem';
import Routes from '../../../../../constants/navigation/Routes';

// Mock FlashList to render items in tests
jest.mock('@shopify/flash-list', () => {
  const { View } = jest.requireActual('react-native');
  return {
    FlashList: ({
      data,
      renderItem,
      keyExtractor,
      testID,
      refreshControl,
      ListFooterComponent,
    }: {
      data: SiteData[];
      renderItem: ({ item }: { item: SiteData }) => React.ReactElement;
      keyExtractor: (item: SiteData) => string;
      testID: string;
      refreshControl?: React.ReactElement;
      ListFooterComponent?: React.ReactElement | null;
      showsVerticalScrollIndicator?: boolean;
    }) => (
      <View testID={testID}>
        {data.map((item: SiteData) => {
          const key = keyExtractor(item);
          return (
            <View key={key} testID={`site-list-item-${key}`}>
              {renderItem({ item })}
            </View>
          );
        })}
        {refreshControl}
        {ListFooterComponent}
      </View>
    ),
  };
});

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('../SiteRowItem/SiteRowItem', () => {
  const { View, Text, TouchableOpacity } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      site,
      onPress,
    }: {
      site: SiteData;
      onPress?: () => void;
      onRemoveFavorite?: () => void;
    }) => (
      <TouchableOpacity testID={`site-wrapper-${site.id}`} onPress={onPress}>
        <Text testID={`site-id-${site.id}`}>{site.id}</Text>
        <Text testID={`site-name-${site.id}`}>{site.name}</Text>
        <Text testID={`has-onpress-${site.id}`}>{String(!!onPress)}</Text>
      </TouchableOpacity>
    ),
  };
});

describe('SitesList', () => {
  const mockNavigation = {
    navigate: jest.fn(),
  };

  const createSite = (
    id: string,
    overrides: Partial<SiteData> = {},
  ): SiteData => ({
    id,
    name: `Site ${id}`,
    url: `https://site${id}.com`,
    displayUrl: `site${id}.com`,
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue(mockNavigation);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('rendering', () => {
    it('renders with empty sites array', () => {
      const { getByTestId, queryByTestId } = render(<SitesList sites={[]} />);

      expect(getByTestId('sites-list')).toBeOnTheScreen();
      expect(queryByTestId('site-wrapper-1')).toBeNull();
    });

    it('renders with single site', () => {
      const sites = [createSite('1')];

      const { getByTestId, queryByTestId } = render(
        <SitesList sites={sites} />,
      );

      expect(getByTestId('site-wrapper-1')).toBeOnTheScreen();
      expect(queryByTestId('site-wrapper-2')).toBeNull();
    });

    it('renders multiple sites', () => {
      const sites = [
        createSite('1'),
        createSite('2'),
        createSite('3'),
        createSite('4'),
        createSite('5'),
      ];

      const { getByTestId } = render(<SitesList sites={sites} />);

      expect(getByTestId('site-wrapper-1')).toBeOnTheScreen();
      expect(getByTestId('site-wrapper-2')).toBeOnTheScreen();
      expect(getByTestId('site-wrapper-3')).toBeOnTheScreen();
      expect(getByTestId('site-wrapper-4')).toBeOnTheScreen();
      expect(getByTestId('site-wrapper-5')).toBeOnTheScreen();
    });
  });

  describe('props passthrough', () => {
    it('passes onPress handler to SiteRowItem', () => {
      const sites = [createSite('1')];

      const { getByTestId } = render(<SitesList sites={sites} />);

      expect(getByTestId('has-onpress-1').props.children).toBe('true');
    });
  });

  describe('navigation', () => {
    it('navigates to browser with site URL when row is pressed', () => {
      const sites = [createSite('1', { url: 'https://example.com' })];

      const { getByTestId } = render(<SitesList sites={sites} />);

      fireEvent.press(getByTestId('site-wrapper-1'));

      expect(mockNavigation.navigate).toHaveBeenCalledWith(
        Routes.BROWSER.HOME,
        expect.objectContaining({
          screen: Routes.BROWSER.VIEW,
          params: expect.objectContaining({
            newTabUrl: 'https://example.com',
            fromTrending: true,
          }),
        }),
      );
    });
  });

  describe('site data rendering', () => {
    it('renders sites with correct data', () => {
      const sites = [
        createSite('1', { name: 'MetaMask' }),
        createSite('unique-id-2', { name: 'Uniswap' }),
        createSite('3', { name: 'OpenSea' }),
      ];

      const { getByTestId } = render(<SitesList sites={sites} />);

      expect(getByTestId('site-name-1').props.children).toBe('MetaMask');
      expect(getByTestId('site-name-unique-id-2').props.children).toBe(
        'Uniswap',
      );
      expect(getByTestId('site-id-unique-id-2').props.children).toBe(
        'unique-id-2',
      );
    });
  });

  describe('edge cases', () => {
    it('renders with sites containing special characters in IDs', () => {
      const sites = [
        createSite('site-with-dash'),
        createSite('site_with_underscore'),
        createSite('site.with.dot'),
      ];

      const { getByTestId } = render(<SitesList sites={sites} />);

      expect(getByTestId('site-wrapper-site-with-dash')).toBeOnTheScreen();
      expect(
        getByTestId('site-wrapper-site_with_underscore'),
      ).toBeOnTheScreen();
      expect(getByTestId('site-wrapper-site.with.dot')).toBeOnTheScreen();
    });

    it('renders with large number of sites', () => {
      const sites = Array.from({ length: 50 }, (_, i) => createSite(`${i}`));

      const { getByTestId } = render(<SitesList sites={sites} />);

      expect(getByTestId('site-wrapper-0')).toBeOnTheScreen();
      expect(getByTestId('site-wrapper-25')).toBeOnTheScreen();
      expect(getByTestId('site-wrapper-49')).toBeOnTheScreen();
    });

    it('still wires onPress when navigation hook returns undefined', () => {
      (useNavigation as jest.Mock).mockReturnValue(undefined);
      const sites = [createSite('1')];

      const { getByTestId } = render(<SitesList sites={sites} />);

      expect(getByTestId('has-onpress-1').props.children).toBe('true');
    });
  });
});
