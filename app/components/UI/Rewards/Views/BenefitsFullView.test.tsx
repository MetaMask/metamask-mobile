import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import BenefitsFullView from './BenefitsFullView';
import { REWARDS_VIEW_SELECTORS } from './RewardsView.constants';

const mockGoBack = jest.fn();
const mockGetAllBenefits = jest.fn().mockResolvedValue(undefined);
const mockUseSelector = jest.fn();
const mockStrings = jest.fn((key: string) => {
  const translations: Record<string, string> = {
    'rewards.benefits.title': 'Benefits',
    'rewards.benefits.list_header': 'Exclusive benefits',
    'rewards.benefits.empty-list': 'You don’t have any benefits right now.',
    'rewards.benefits.powered_by': 'Powered by',
  };
  return translations[key] || key;
});

type TestBenefit = {
  id: number;
  longTitle: string;
  shortDescription: string;
};

let mockBenefits: TestBenefit[] = [];

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack }),
}));

jest.mock('react-redux', () => ({
  useSelector: (selector: unknown) => mockUseSelector(selector),
}));

jest.mock('../hooks/useBenefits', () => ({
  useBenefits: () => ({
    getAllBenefits: mockGetAllBenefits,
  }),
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({ style: (...args: unknown[]) => args }),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  return { ...actual };
});

jest.mock(
  '../../../../component-library/components-temp/HeaderCompactStandard',
  () => {
    const ReactActual = jest.requireActual('react');
    const { Pressable, Text, View } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: ({ title, onBack }: { title: string; onBack: () => void }) =>
        ReactActual.createElement(
          View,
          { testID: 'header' },
          ReactActual.createElement(Text, null, title),
          ReactActual.createElement(Pressable, {
            onPress: onBack,
            testID: 'header-back-button',
          }),
        ),
    };
  },
);

jest.mock('../../../Views/ErrorBoundary', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('../components/Benefits/BenefitCard', () => {
  const ReactActual = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ benefit }: { benefit: TestBenefit }) =>
      ReactActual.createElement(Text, null, benefit.longTitle),
  };
});

jest.mock('../components/Benefits/BenefitEmptyList', () => {
  const ReactActual = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  const { strings } = jest.requireActual('../../../../../locales/i18n');
  return {
    __esModule: true,
    default: () =>
      ReactActual.createElement(
        Text,
        null,
        strings('rewards.benefits.empty-list'),
      ),
  };
});

jest.mock('../components/Benefits/TheMiracleFooter', () => {
  const ReactActual = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  const { strings } = jest.requireActual('../../../../../locales/i18n');
  return {
    __esModule: true,
    default: () =>
      ReactActual.createElement(
        Text,
        null,
        strings('rewards.benefits.powered_by'),
      ),
  };
});

jest.mock('react-native-safe-area-context', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    SafeAreaView: ({
      children,
      testID,
    }: React.PropsWithChildren<{ testID?: string }>) =>
      ReactActual.createElement(View, { testID }, children),
  };
});

jest.mock('react-native', () => {
  const ReactActual = jest.requireActual('react');
  const actual = jest.requireActual('react-native');
  const { Pressable, View } = actual;

  const FlatList = ({
    data,
    renderItem,
    ListFooterComponent,
    ListHeaderComponent,
    ListEmptyComponent,
    refreshControl,
  }: {
    data: TestBenefit[];
    renderItem: ({ item }: { item: TestBenefit }) => React.ReactElement;
    ListFooterComponent?: React.ReactElement;
    ListHeaderComponent?: React.ReactElement;
    ListEmptyComponent?: React.ReactElement;
    refreshControl?: { props?: { onRefresh?: () => Promise<void> } };
  }) =>
    ReactActual.createElement(
      View,
      { testID: 'benefits-flat-list' },
      ListHeaderComponent ?? null,
      data.length
        ? data.map((item) =>
            ReactActual.createElement(
              View,
              { key: String(item.id) },
              renderItem({ item }),
            ),
          )
        : (ListEmptyComponent ?? null),
      ListFooterComponent ?? null,
      ReactActual.createElement(Pressable, {
        testID: 'trigger-refresh',
        onPress: () => refreshControl?.props?.onRefresh?.(),
      }),
    );

  return {
    ...actual,
    FlatList,
  };
});

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => mockStrings(key),
}));

describe('BenefitsFullView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBenefits = [];
    mockUseSelector.mockReturnValue(mockBenefits);
  });

  it('renders view container and header title', () => {
    const { getByTestId, getByText } = render(<BenefitsFullView />);

    expect(
      getByTestId(REWARDS_VIEW_SELECTORS.LIST_BENEFIT_VIEW),
    ).toBeOnTheScreen();
    expect(getByText('Benefits')).toBeOnTheScreen();
  });

  it('navigates back when back button is pressed', () => {
    const { getByTestId } = render(<BenefitsFullView />);

    fireEvent.press(getByTestId('header-back-button'));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('renders empty state when there are no benefits', () => {
    const { getByText, queryByText } = render(<BenefitsFullView />);

    expect(
      getByText('You don’t have any benefits right now.'),
    ).toBeOnTheScreen();
    expect(queryByText('Exclusive benefits')).toBeNull();
    expect(queryByText('Powered by')).toBeNull();
  });

  it('renders benefits, list header, and footer when benefits exist', () => {
    mockBenefits = [
      { id: 1, longTitle: 'Benefit One', shortDescription: 'One' },
      { id: 2, longTitle: 'Benefit Two', shortDescription: 'Two' },
    ];
    mockUseSelector.mockReturnValue(mockBenefits);

    const { getByText, queryByText } = render(<BenefitsFullView />);

    expect(getByText('Exclusive benefits')).toBeOnTheScreen();
    expect(getByText('Benefit One')).toBeOnTheScreen();
    expect(getByText('Benefit Two')).toBeOnTheScreen();
    expect(getByText('Powered by')).toBeOnTheScreen();
    expect(queryByText('You don’t have any benefits right now.')).toBeNull();
    expect(mockStrings).toHaveBeenCalledWith('rewards.benefits.title');
    expect(mockStrings).toHaveBeenCalledWith('rewards.benefits.list_header');
  });

  it('calls getAllBenefits on pull-to-refresh', async () => {
    const { UNSAFE_getByType } = render(<BenefitsFullView />);
    const { RefreshControl } = require('react-native');
    const refreshControl = UNSAFE_getByType(RefreshControl);
    fireEvent(refreshControl, 'refresh');

    await waitFor(() => {
      expect(mockGetAllBenefits).toHaveBeenCalledTimes(1);
    });
  });
});
