import React from 'react';
import {
  Button,
  InteractionManager,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { clone } from 'lodash';
import { fireEvent, waitFor, userEvent } from '@testing-library/react-native';
import Tokens from './';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { createStackNavigator } from '@react-navigation/stack';
import initialRootState from '../../../util/test/initial-root-state';
import { WalletViewSelectorsIDs } from '../../../../e2e/selectors/wallet/WalletView.selectors';
import { TokenList } from './TokenList/TokenList';
import { ScrollView } from 'react-native-gesture-handler';
import { TokenI } from './types';
// eslint-disable-next-line import/no-namespace
import * as MusdConversionAssetListCtaModule from '../Earn/components/Musd/MusdConversionAssetListCta';
// eslint-disable-next-line import/no-namespace
import * as TokenListControlBarModule from './TokenListControlBar/TokenListControlBar';
// eslint-disable-next-line import/no-namespace
import * as MultichainAccountsModule from '../../../selectors/featureFlagController/multichainAccounts/enabledMultichainAccounts';
// eslint-disable-next-line import/no-namespace
import * as AssetsListSelectorsModule from '../../../selectors/assets/assets-list';
// eslint-disable-next-line import/no-namespace
import * as RefreshTokensModule from './util/refreshTokens';
// eslint-disable-next-line import/no-namespace
import * as RemoveEvmTokenModule from './util/removeEvmToken';
// eslint-disable-next-line import/no-namespace
import * as RemoveNonEvmTokenModule from './util/removeNonEvmToken';

// Mocking versioning for some selectors
jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('1.0.0'),
}));

// Mock MusdConversionAssetListCta to prevent deep dependency chain issues
jest.mock('../Earn/components/Musd/MusdConversionAssetListCta', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () => <View testID="musd-conversion-cta" />,
  };
});

const mockNavigate = jest.fn();
const mockPush = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
      push: mockPush,
    }),
  };
});

jest.mock('./TokenList/TokenList', () => ({
  TokenList: jest.fn().mockImplementation(() => null),
}));

/**
 * For these unit tests, we do not need to test all the actual components, and can mock them.
 * If we do need to test the actual components in this test, we can use `mockReset` to get back the original component
 * @returns - Mocked components
 */
const arrangeMockComponents = () => {
  const mockMusdConversionAssetListCta = jest
    .spyOn(MusdConversionAssetListCtaModule, 'default')
    .mockImplementation(() => <View testID="musd-conversion-cta" />);

  const mockTokenListControlBar = jest
    .spyOn(TokenListControlBarModule, 'TokenListControlBar')
    .mockImplementation(({ goToAddToken }) => (
      <View testID="token-list-control-bar">
        <Button
          testID="MOCK_TEST_ADD_TOKEN_BUTTON"
          title="Add Token"
          onPress={goToAddToken}
        />
      </View>
    ));

  const mockTokensList = jest
    .mocked(TokenList)
    .mockImplementation(({ tokenKeys, onRefresh, showRemoveMenu }) => (
      <ScrollView testID="tokens-list-scroll-view">
        <Button
          testID="MOCK_TEST_REFRESH_BUTTON"
          title="Refresh"
          onPress={onRefresh}
        />
        {tokenKeys.map((token) => (
          <TouchableOpacity
            key={token.address}
            testID={`asset-${token.address}`}
            onLongPress={() =>
              showRemoveMenu({
                address: token.address,
                chainId: token.chainId,
                isStaked: token.isStaked,
              } as TokenI)
            }
          >
            <Text>{token.address}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    ));

  return {
    mockMusdConversionAssetListCta,
    mockTokenListControlBar,
    mockTokensList,
  };
};

const arrangeMockSelectors = () => {
  const mockSelectMultichainAccountsState2Enabled = jest
    .spyOn(MultichainAccountsModule, 'selectMultichainAccountsState2Enabled')
    .mockImplementation(() => true);

  const mockSelectSortedAssetsBySelectedAccountGroup = jest
    .spyOn(
      AssetsListSelectorsModule,
      'selectSortedAssetsBySelectedAccountGroup',
    )
    .mockImplementation(() => [
      { address: '0xToken1', chainId: '0x1', isStaked: false },
      { address: '0xToken2', chainId: '0x2', isStaked: false },
      { address: '0xToken3', chainId: '0x3', isStaked: false },
    ]);

  return {
    mockSelectMultichainAccountsState2Enabled,
    mockSelectSortedAssetsBySelectedAccountGroup,
  };
};

const arrangeMockInteractionManager = () => {
  const mockRunAfterInteractions = jest
    .spyOn(InteractionManager, 'runAfterInteractions')
    .mockImplementation((cb) => {
      if (typeof cb === 'function') {
        cb();
      }
      return {
        then: jest.fn(),
        done: jest.fn(),
        cancel: jest.fn(),
      };
    });

  return { mockRunAfterInteractions };
};

const arrangeMockState = () => clone(initialRootState);
const initialState = arrangeMockState();

const Stack = createStackNavigator();
const renderComponent = (state = initialState, isFullView: boolean = false) =>
  renderWithProvider(
    <Stack.Navigator>
      <Stack.Screen name="Tokens" options={{}}>
        {() => <Tokens isFullView={isFullView} />}
      </Stack.Screen>
    </Stack.Navigator>,
    { state },
  );

describe('Tokens', () => {
  beforeEach(() => {
    arrangeMockComponents();
    arrangeMockSelectors();
    arrangeMockInteractionManager();
  });

  afterEach(() => {
    mockNavigate.mockClear();
    mockPush.mockClear();
    jest.clearAllMocks();
  });

  it('displays container', async () => {
    const { getByTestId } = renderComponent();

    expect(
      getByTestId(WalletViewSelectorsIDs.TOKENS_CONTAINER),
    ).toBeOnTheScreen();
  });

  it('displays loading skeleton', async () => {
    // Force mockInteraction to not run immediately to test the skeleton
    const { mockRunAfterInteractions } = arrangeMockInteractionManager();
    mockRunAfterInteractions.mockRestore();

    const { getByTestId } = renderComponent();

    expect(getByTestId('token-list-skeleton')).toBeOnTheScreen();
  });

  it('displays empty state when no tokens are present', async () => {
    const { mockSelectSortedAssetsBySelectedAccountGroup } =
      arrangeMockSelectors();
    mockSelectSortedAssetsBySelectedAccountGroup.mockReturnValue([]);

    const { getByTestId } = renderComponent(initialState);

    expect(getByTestId('tokens-empty-state')).toBeOnTheScreen();
  });

  it('displays token list', async () => {
    const { getByTestId } = renderComponent(initialState);

    expect(getByTestId('tokens-list-scroll-view')).toBeOnTheScreen();
    expect(getByTestId('asset-0xToken1')).toBeOnTheScreen();
    expect(getByTestId('asset-0xToken2')).toBeOnTheScreen();
    expect(getByTestId('asset-0xToken3')).toBeOnTheScreen();
  });

  it('performs token refresh', () => {
    const mockRefreshTokens = jest
      .spyOn(RefreshTokensModule, 'refreshTokens')
      .mockResolvedValue();
    const { getByTestId } = renderComponent(initialState);

    fireEvent.press(getByTestId('MOCK_TEST_REFRESH_BUTTON'));

    expect(mockRefreshTokens).toHaveBeenCalled();
  });

  it('performs token addition navigation', async () => {
    const { getByTestId } = renderComponent(initialState);

    // Act - press add token button
    await userEvent.press(getByTestId('MOCK_TEST_ADD_TOKEN_BUTTON'));

    // Assert - navigation to add token screen
    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith('AddAsset', {
        assetType: 'token',
      }),
    );
  });

  const removeTokenTests = [
    // EVM Token Removal
    {
      address: '0xToken1',
      chainId: '0x1',
      isStaked: false,
      type: 'evm',
      arrangeMockRemoval: () =>
        jest.spyOn(RemoveEvmTokenModule, 'removeEvmToken').mockResolvedValue(),
      assertRemovalCalled: (mockRemoveEvmToken: jest.Mock) =>
        expect(mockRemoveEvmToken).toHaveBeenCalled(),
    },
    // Non-EVM Token Removal
    {
      address: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
      chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      isStaked: false,
      type: 'non-evm',
      arrangeMockRemoval: () =>
        jest
          .spyOn(RemoveNonEvmTokenModule, 'removeNonEvmToken')
          .mockResolvedValue(),
      assertRemovalCalled: (mockRemoveNonEvmToken: jest.Mock) =>
        expect(mockRemoveNonEvmToken).toHaveBeenCalled(),
    },
  ];

  it.each(removeTokenTests)(
    'performs token removal - $type',
    async ({
      address,
      chainId,
      isStaked,
      arrangeMockRemoval,
      assertRemovalCalled,
    }) => {
      const { mockSelectSortedAssetsBySelectedAccountGroup } =
        arrangeMockSelectors();
      mockSelectSortedAssetsBySelectedAccountGroup.mockReturnValue([
        { address, chainId, isStaked },
      ]);
      const mockRemoveToken = arrangeMockRemoval() as jest.Mock;

      const { getByTestId, queryByTestId } = renderComponent(initialState);

      // Act - long press to remove token
      await userEvent.longPress(getByTestId(`asset-${address}`));

      // Assert - bottom sheet is displayed
      await waitFor(() => {
        expect(getByTestId('remove-token-bottom-sheet')).toBeOnTheScreen();
      });

      // Act - press remove button
      await userEvent.press(
        getByTestId('remove-token-bottom-sheet-remove-button'),
      );

      // Assert - remove token calls
      assertRemovalCalled(mockRemoveToken);

      // Assert - bottom sheet is closed
      await waitFor(() => {
        expect(
          queryByTestId('remove-token-bottom-sheet'),
        ).not.toBeOnTheScreen();
      });
    },
  );
});
