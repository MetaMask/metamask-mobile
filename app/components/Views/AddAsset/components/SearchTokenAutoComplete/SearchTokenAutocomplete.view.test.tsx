import '../../../../../../tests/component-view/mocks';
import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { SupportedCaipChainId } from '@metamask/multichain-network-controller';
import NetInfo from '@react-native-community/netinfo';
import type NetInfoMock from '../../../../../__mocks__/@react-native-community/netinfo';
import { renderComponentViewScreen } from '../../../../../../tests/component-view/render';
import {
  clearTokenImportApiMocks,
  getTokenImportRequests,
  setupTokenImportApiMock,
  TRON_CATALOG_PATH,
} from '../../../../../../tests/component-view/api-mocking/tokenImport';
import { ImportTokenViewSelectorsIDs } from '../../ImportAssetView.testIds';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import SearchTokenAutocomplete from './SearchTokenAutocomplete';

const TRON_CHAIN_ID = 'tron:728126428' as SupportedCaipChainId;

const netInfoMock = NetInfo as unknown as typeof NetInfoMock;

const TronSearchScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { selectedChainId } = (route.params ?? {}) as {
    selectedChainId?: SupportedCaipChainId;
  };

  return (
    <SearchTokenAutocomplete
      navigation={navigation as unknown as AppNavigationProp}
      tabLabel=""
      selectedChainId={selectedChainId ?? null}
    />
  );
};

const renderScreen = () =>
  renderComponentViewScreen(
    TronSearchScreen,
    { name: 'SearchTokenAutocomplete' },
    {
      state: {
        engine: {
          backgroundState: {
            PreferencesController: { useTokenDetection: true },
          },
        },
      },
    },
    { selectedChainId: TRON_CHAIN_ID },
  );

const catalogRequests = () =>
  getTokenImportRequests().filter((url) => url.includes(TRON_CATALOG_PATH));

describe('SearchTokenAutocomplete token import', () => {
  beforeEach(() => {
    netInfoMock.__setMockNetInfo({ type: 'wifi', isInternetReachable: true });
    setupTokenImportApiMock();
  });

  afterEach(() => {
    clearTokenImportApiMocks();
    netInfoMock.__resetMockNetInfo();
  });

  it('browses the full non-EVM catalog on an empty search and hides the native asset', async () => {
    const { getByText, queryByText, getByTestId } = renderScreen();

    await waitFor(() => expect(getByText('CATALOG')).toBeOnTheScreen());

    expect(catalogRequests()).toHaveLength(1);
    expect(catalogRequests()[0]).toContain('first=25');
    expect(queryByText('TRX')).not.toBeOnTheScreen();
    expect(
      getByTestId(ImportTokenViewSelectorsIDs.SEARCH_TOKEN_RESULTS_LIST),
    ).toBeOnTheScreen();
  });

  it('falls back to trending results when the catalog request fails', async () => {
    clearTokenImportApiMocks();
    setupTokenImportApiMock({ catalogStatus: 400 });

    const { getByText } = renderScreen();

    await waitFor(() => expect(getByText('TRENDING')).toBeOnTheScreen());
    expect(catalogRequests()).toHaveLength(1);
    expect(catalogRequests()[0]).toContain('first=25');
  });

  it('appends the next catalog page when the results list reaches its end', async () => {
    const { getByText, getByTestId } = renderScreen();
    await waitFor(() => expect(getByText('CATALOG')).toBeOnTheScreen());

    fireEvent(
      getByTestId(ImportTokenViewSelectorsIDs.SEARCH_TOKEN_RESULTS_LIST),
      'onEndReached',
    );

    await waitFor(() => expect(getByText('CATALOG_NEXT')).toBeOnTheScreen());
    expect(decodeURIComponent(catalogRequests().join(' '))).toContain(
      'after=catalog-cursor',
    );
  });

  it('appends the next search page when a typed query reaches the list end', async () => {
    const { getByText, getByTestId } = renderScreen();
    fireEvent.changeText(
      getByTestId(ImportTokenViewSelectorsIDs.SEARCH_BAR),
      'catalog',
    );
    await waitFor(() => expect(getByText('SEARCHED')).toBeOnTheScreen());

    fireEvent(
      getByTestId(ImportTokenViewSelectorsIDs.SEARCH_TOKEN_RESULTS_LIST),
      'onEndReached',
    );

    await waitFor(() => expect(getByText('SEARCHED_NEXT')).toBeOnTheScreen());
    expect(
      decodeURIComponent(
        getTokenImportRequests()
          .filter((url) => url.includes('/tokens/search'))
          .join(' '),
      ),
    ).toContain('after=search-cursor');
  });

  it('does not request the catalog while offline', async () => {
    netInfoMock.__setMockNetInfo({ type: 'none' });

    const { getByTestId } = renderScreen();
    await waitFor(() =>
      expect(
        getByTestId(ImportTokenViewSelectorsIDs.SEARCH_BAR),
      ).toBeOnTheScreen(),
    );

    expect(catalogRequests()).toHaveLength(0);
  });
});
