import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from '@metamask/design-system-react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { mockHomePacks } from '../../../../UI/Collectibles/mocks/homePacks';
import { collectiblesTestIds } from '../../../../UI/Collectibles/Collectibles.testIds';
import { strings } from '../../../../../../locales/i18n';
import { collectiblesRoutes } from '#app/components/UI/Collectibles/routeNames';
import { getFormatters } from '#app/components/hooks/useFormatters';
import { homepageSectionTitleTestId } from '#app/components/Views/Homepage/Homepage.testIds';
import { HomeSectionNames } from '#app/components/Views/Homepage/hooks/useHomeViewedEvent';
import { CollectiblesSection } from './CollectiblesSection';

let mockQuery: {
  data?: unknown;
  isPending: boolean;
  isError: boolean;
  refetch: jest.Mock;
};

jest.mock('../../../../UI/Collectibles/hooks/useHomePacks', () => ({
  useHomePacks: () => mockQuery,
}));
jest.mock('../../hooks/useHomeViewedEvent', () => ({
  ...jest.requireActual('../../hooks/useHomeViewedEvent'),
  __esModule: true,
  default: () => ({ onLayout: jest.fn() }),
}));
jest.mock('../../hooks/useSectionPerformance', () => ({
  useSectionPerformance: jest.fn(),
}));

const Stack = createNativeStackNavigator();

function HomeScreen() {
  return <CollectiblesSection sectionIndex={0} totalSectionsLoaded={1} />;
}

function CollectiblesStub() {
  return <Text>collectibles landing</Text>;
}

function renderSection() {
  return renderWithProvider(
    <Stack.Navigator>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen
        name={collectiblesRoutes.root}
        component={CollectiblesStub}
      />
    </Stack.Navigator>,
  );
}

describe('CollectiblesSection', () => {
  beforeEach(() => {
    mockQuery = {
      data: mockHomePacks,
      isPending: false,
      isError: false,
      refetch: jest.fn(),
    };
  });

  it('shows skeletons while loading', () => {
    mockQuery = { ...mockQuery, data: undefined, isPending: true };
    renderSection();
    expect(screen.getByTestId(collectiblesTestIds.skeleton)).toBeOnTheScreen();
  });

  it.each([
    ['there are no packs', { data: [] }],
    ['the query fails', { data: undefined, isError: true }],
  ])('shows the empty placeholder when %s', (_, state) => {
    mockQuery = { ...mockQuery, ...state };
    renderSection();
    expect(screen.getByTestId(collectiblesTestIds.empty)).toBeOnTheScreen();
    expect(
      screen.getByText(strings('collectibles.home.empty')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('collectibles.home.empty_description')),
    ).toBeOnTheScreen();
  });

  it('keeps cached packs when a refetch fails', () => {
    mockQuery = { ...mockQuery, isError: true };
    renderSection();
    expect(
      screen.getByTestId(collectiblesTestIds.tile(mockHomePacks[0].code)),
    ).toBeOnTheScreen();
  });

  it('renders the mock packs', () => {
    renderSection();
    const [firstPack] = mockHomePacks;
    expect(screen.getByText(strings('collectibles.title'))).toBeOnTheScreen();
    expect(
      screen.getByTestId(collectiblesTestIds.tile(firstPack.code)),
    ).toBeOnTheScreen();
    expect(screen.getByText(firstPack.name)).toBeOnTheScreen();
    expect(
      screen.getByText(
        getFormatters().formatCurrency(firstPack.priceUsd, 'USD'),
      ),
    ).toBeOnTheScreen();
  });

  it('opens the collectibles landing screen from the header', async () => {
    renderSection();

    fireEvent.press(
      screen.getByTestId(
        homepageSectionTitleTestId(HomeSectionNames.COLLECTIBLES),
      ),
    );

    expect(await screen.findByText('collectibles landing')).toBeOnTheScreen();
  });
});
