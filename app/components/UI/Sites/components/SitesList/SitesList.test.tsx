import React from 'react';
import { render } from '@testing-library/react-native';
import SitesList from './SitesList';
import { useNavigation } from '@react-navigation/native';
import type { SiteData } from '../SiteRowItem/SiteRowItem';

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

jest.mock('../SiteRowItemWrapper/SiteRowItemWrapper', () => {
  const { View, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      site,
      navigation,
    }: {
      site: SiteData;
      navigation: unknown;
    }) => (
      <View testID={`site-wrapper-${site.id}`}>
        <Text testID={`site-id-${site.id}`}>{site.id}</Text>
        <Text testID={`site-name-${site.id}`}>{site.name}</Text>
        <Text testID={`has-navigation-${site.id}`}>{String(!!navigation)}</Text>
      </View>
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
    it('passes navigation to SiteRowItemWrapper', () => {
      const sites = [createSite('1')];

      const { getByTestId } = render(<SitesList sites={sites} />);

      expect(getByTestId('has-navigation-1').props.children).toBe('true');
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

    it('renders when navigation is not provided', () => {
      (useNavigation as jest.Mock).mockReturnValue(undefined);
      const sites = [createSite('1')];

      const { getByTestId } = render(<SitesList sites={sites} />);

      expect(getByTestId('has-navigation-1').props.children).toBe('false');
    });
  });
});
