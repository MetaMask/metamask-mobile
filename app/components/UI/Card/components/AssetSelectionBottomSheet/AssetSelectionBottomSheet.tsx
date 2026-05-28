import React, {
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../../../util/theme';
import {
  FundingStatus,
  CardFundingToken,
  DelegationSettingsResponse,
} from '../../types';

import { strings } from '../../../../../../locales/i18n';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  AvatarBaseShape,
  AvatarNetwork,
  AvatarNetworkSize,
  AvatarToken,
  AvatarTokenSize,
  BadgeNetwork,
  BadgeWrapper,
  BadgeWrapperPosition,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Button,
  ButtonVariant,
  FontWeight,
  Spinner,
  Text,
  TextColor,
  TextVariant,
  type ImageOrSvgSrc,
} from '@metamask/design-system-react-native';
import { IconName } from '../../../../../component-library/components/Icons/Icon';
import Routes from '../../../../../constants/navigation/Routes';
import { buildTokenIconUrl } from '../../util/buildTokenIconUrl';
import { getNetworkImageSource } from '../../../../../util/networks';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import HeaderCompactStandard from '../../../../../component-library/components-temp/HeaderCompactStandard';
import ButtonToggle from '../../../../../component-library/components-temp/Buttons/ButtonToggle';
import { ButtonSize as ButtonToggleSize } from '../../../../../component-library/components/Buttons/Button';
import TextFieldSearch from '../../../../../component-library/components/Form/TextFieldSearch';
import { FlatList, ScrollView } from 'react-native-gesture-handler';
import { safeFormatChainIdToHex } from '../../util/safeFormatChainIdToHex';
import {
  ToastContext,
  ToastVariants,
} from '../../../../../component-library/components/Toast';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { CardActions } from '../../util/metrics';
import { truncateAddress } from '../../util/truncateAddress';
import { getAssetBalanceKey } from '../../util/getAssetBalanceKey';
import { mapCaipChainIdToChainName } from '../../util/mapCaipChainIdToChainName';
import { useUpdateFundingPriority } from '../../hooks/useUpdateFundingPriority';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../util/navigation/navUtils';
import { useCardHomeData } from '../../hooks/useCardHomeData';
import { cardNetworkInfos } from '../../constants';
import { CaipChainId } from '@metamask/utils';
import musdAssetIcon from '../../../../../images/musd-icon-2x.png';

interface AssetSelectionModalNavigationDetails {
  navigateToCardHomeOnPriorityToken?: boolean;
  selectionOnly?: boolean;
  onTokenSelect?: (token: CardFundingToken) => void;
  callerRoute?: string;
  callerParams?: Record<string, unknown>;
  excludedTokens?: CardFundingToken[];
}

type AssetSelectionToken = CardFundingToken & {
  balance: string;
  balanceFiat: string;
  rawFiatNumber?: number;
};

interface NetworkFilterOption {
  caipChainId: CaipChainId;
  label: string;
  imageSource: ImageOrSvgSrc;
  totalFiat: number;
  delegationIndex: number;
}

const NETWORK_FILTER_ALL = 'all';

export const AssetSelectionBottomSheetSelectors = {
  SEARCH_INPUT: 'card-asset-selection-search-input',
  SEARCH_INPUT_FIELD: 'card-asset-selection-search-input-field',
  NETWORK_FILTER_BAR: 'card-asset-selection-network-filter-bar',
  NETWORK_FILTER_ALL: 'card-asset-selection-network-filter-all',
  EMPTY_FILTER_RESULTS: 'card-asset-selection-empty-filter-results',
  CLEAR_FILTERS_BUTTON: 'card-asset-selection-clear-filters-button',
  LOADING: 'card-asset-selection-loading',
  MONEY_ACCOUNT_ICON: 'card-asset-selection-money-account-icon',
  getNetworkFilter: (chainId: string) =>
    `card-asset-selection-network-filter-${chainId}`,
  getAssetItem: (symbol: string | null | undefined, chainId: string) =>
    `asset-select-item-${symbol ?? 'unknown'}-${chainId}`,
  getAssetNetworkBadge: (symbol: string | null | undefined, chainId: string) =>
    `asset-select-network-badge-${symbol ?? 'unknown'}-${chainId}`,
} as const;

export const createAssetSelectionModalNavigationDetails =
  createNavigationDetails<AssetSelectionModalNavigationDetails>(
    Routes.CARD.MODALS.ID,
    Routes.CARD.MODALS.ASSET_SELECTION,
  );

const moneyAccountTokenSymbol = () =>
  strings('card.card_spending_limit.money_account_token_symbol');

const moneyAccountLabel = () =>
  strings('card.card_spending_limit.money_account_label');

const getCaipChainIdFromDelegationNetwork = (
  network: DelegationSettingsResponse['networks'][0],
): CaipChainId | null => {
  const networkName = network.network?.toLowerCase();
  const knownNetworkInfo =
    cardNetworkInfos[networkName as keyof typeof cardNetworkInfos];

  if (knownNetworkInfo?.caipChainId) {
    return knownNetworkInfo.caipChainId;
  }

  if (!network.chainId) {
    return null;
  }

  if (network.chainId.includes(':')) {
    return network.chainId as CaipChainId;
  }

  const numericChainId = network.chainId.startsWith('0x')
    ? parseInt(network.chainId, 16)
    : parseInt(network.chainId, 10);

  if (Number.isNaN(numericChainId)) {
    return null;
  }

  return `eip155:${numericChainId}` as CaipChainId;
};

const getTokenDisplaySymbol = (token: CardFundingToken) =>
  token.isMoneyAccountEntry ? moneyAccountTokenSymbol() : (token.symbol ?? '');

const getTokenDisplayName = (token: CardFundingToken) => {
  if (token.isMoneyAccountEntry) {
    return moneyAccountLabel();
  }

  return `${token.symbol ?? ''} on ${mapCaipChainIdToChainName(
    token.caipChainId,
  )}`;
};

const getTokenIconSource = (token: CardFundingToken): ImageOrSvgSrc => {
  if (token.isMoneyAccountEntry) {
    return musdAssetIcon as ImageOrSvgSrc;
  }

  return {
    uri: buildTokenIconUrl(token.caipChainId, token.address ?? ''),
  };
};

const tokenMatchesSearch = (
  token: AssetSelectionToken,
  searchQuery: string,
  fundingStatusText: string,
) => {
  const query = searchQuery.trim().toLowerCase();

  if (!query) {
    return true;
  }

  const searchableValues = [
    getTokenDisplayName(token),
    getTokenDisplaySymbol(token),
    token.name,
    token.symbol,
    token.address,
    token.walletAddress,
    mapCaipChainIdToChainName(token.caipChainId),
    fundingStatusText,
    token.isMoneyAccountEntry ? moneyAccountLabel() : undefined,
  ];

  return searchableValues.some((value) => value?.toLowerCase().includes(query));
};

const getFundingStatusText = (state: FundingStatus): string => {
  if (state === FundingStatus.Enabled) {
    return strings('card.asset_selection.enabled');
  }
  if (state === FundingStatus.Limited) {
    return strings('card.asset_selection.limited');
  }
  return strings('card.asset_selection.not_enabled');
};

const AssetSelectionBottomSheet: React.FC = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation();
  const {
    navigateToCardHomeOnPriorityToken = false,
    selectionOnly = false,
    onTokenSelect,
    callerRoute,
    callerParams,
    excludedTokens,
  } = useParams<AssetSelectionModalNavigationDetails>();

  const theme = useTheme();
  const tw = useTailwind();
  const { toastRef } = useContext(ToastContext);
  const { trackEvent, createEventBuilder } = useAnalytics();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNetworkFilter, setSelectedNetworkFilter] =
    useState<string>(NETWORK_FILTER_ALL);

  const {
    availableTokens: homeAvailableTokens,
    primaryToken,
    balanceMap,
    data: cardHomeData,
  } = useCardHomeData();

  const supportedTokens = useMemo<CardFundingToken[]>(() => {
    const filtered = excludedTokens?.length
      ? homeAvailableTokens.filter(
          (token) =>
            !excludedTokens.some(
              (ex) =>
                ex.address?.toLowerCase() === token.address?.toLowerCase() &&
                ex.caipChainId === token.caipChainId,
            ),
        )
      : homeAvailableTokens;

    return [...filtered].sort((a, b) => {
      if (
        a.priority !== undefined &&
        a.priority !== null &&
        b.priority !== undefined &&
        b.priority !== null
      ) {
        return a.priority - b.priority;
      }
      if (a.priority !== undefined && a.priority !== null) return -1;
      if (b.priority !== undefined && b.priority !== null) return 1;
      if (
        a.fundingStatus === FundingStatus.Enabled &&
        b.fundingStatus !== FundingStatus.Enabled
      ) {
        return -1;
      }
      if (
        a.fundingStatus !== FundingStatus.Enabled &&
        b.fundingStatus === FundingStatus.Enabled
      ) {
        return 1;
      }
      return 0;
    });
  }, [homeAvailableTokens, excludedTokens]);

  const supportedTokensWithBalances = useMemo<AssetSelectionToken[]>(
    () =>
      supportedTokens
        .map((token) => {
          const balanceInfo = balanceMap.get(getAssetBalanceKey(token));
          return {
            ...token,
            balance: balanceInfo?.rawTokenBalance?.toFixed(6) || '0',
            balanceFiat: balanceInfo?.balanceFiat || '$0.00',
            rawFiatNumber: balanceInfo?.rawFiatNumber,
          };
        })
        .sort((a, b) => {
          if (
            a.fundingStatus === FundingStatus.NotEnabled &&
            b.fundingStatus === FundingStatus.NotEnabled
          ) {
            return (b.rawFiatNumber ?? -1) - (a.rawFiatNumber ?? -1);
          }
          return 0;
        }),
    [supportedTokens, balanceMap],
  );

  const networkFilterOptions = useMemo<NetworkFilterOption[]>(() => {
    const delegationNetworks = cardHomeData?.delegationSettings?.networks ?? [];
    const tokenChainIds = new Set(
      supportedTokensWithBalances.map((token) => token.caipChainId),
    );

    return delegationNetworks
      .map((network, index) => {
        const caipChainId = getCaipChainIdFromDelegationNetwork(network);

        if (!caipChainId || !tokenChainIds.has(caipChainId)) {
          return null;
        }

        const totalFiat = supportedTokensWithBalances
          .filter((token) => token.caipChainId === caipChainId)
          .reduce((sum, token) => sum + (token.rawFiatNumber ?? 0), 0);

        return {
          caipChainId,
          label: mapCaipChainIdToChainName(caipChainId),
          imageSource: getNetworkImageSource({
            chainId: caipChainId,
          }) as ImageOrSvgSrc,
          totalFiat,
          delegationIndex: index,
        };
      })
      .filter((option): option is NetworkFilterOption => Boolean(option))
      .sort(
        (a, b) =>
          b.totalFiat - a.totalFiat || a.delegationIndex - b.delegationIndex,
      );
  }, [cardHomeData?.delegationSettings?.networks, supportedTokensWithBalances]);

  const filteredTokens = useMemo(
    () =>
      supportedTokensWithBalances
        .filter((token) => {
          if (selectedNetworkFilter === NETWORK_FILTER_ALL) {
            return true;
          }

          return token.caipChainId === selectedNetworkFilter;
        })
        .filter((token) =>
          tokenMatchesSearch(
            token,
            searchQuery,
            getFundingStatusText(token.fundingStatus),
          ),
        ),
    [searchQuery, selectedNetworkFilter, supportedTokensWithBalances],
  );

  const showNetworkFilter = networkFilterOptions.length > 1;
  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    selectedNetworkFilter !== NETWORK_FILTER_ALL;

  const closeBottomSheetAndNavigate = useCallback(
    (navigateFunc: () => void) => {
      sheetRef.current?.onCloseBottomSheet(navigateFunc);
    },
    [sheetRef],
  );

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedNetworkFilter(NETWORK_FILTER_ALL);
  }, []);

  const showSuccessToast = useCallback(() => {
    toastRef?.current?.showToast({
      variant: ToastVariants.Icon,
      labelOptions: [{ label: strings('card.asset_selection.update_success') }],
      iconName: IconName.Confirmation,
      iconColor: theme.colors.success.default,
      backgroundColor: theme.colors.success.muted,
      hasNoTimeout: false,
    });
  }, [toastRef, theme]);

  const showErrorToast = useCallback(() => {
    toastRef?.current?.showToast({
      variant: ToastVariants.Icon,
      labelOptions: [{ label: strings('card.asset_selection.update_error') }],
      iconName: IconName.Danger,
      iconColor: theme.colors.error.default,
      backgroundColor: theme.colors.error.muted,
      hasNoTimeout: false,
    });
  }, [toastRef, theme]);

  const { updateFundingPriority } = useUpdateFundingPriority({
    onSuccess: () => {
      showSuccessToast();
      sheetRef.current?.onCloseBottomSheet();
    },
    onError: () => {
      showErrorToast();
      sheetRef.current?.onCloseBottomSheet();
    },
  });

  const updatePriority = useCallback(
    async (token: CardFundingToken) => {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
          .addProperties({
            action: CardActions.ASSET_ITEM_SELECT_TOKEN_BOTTOMSHEET,
            bottomsheet_selected_token_symbol: token.symbol,
            bottomsheet_selected_token_chain_id: token.caipChainId,
            bottomsheet_selected_token_limit_amount: isNaN(
              Number(token.spendableBalance),
            )
              ? 0
              : Number(token.spendableBalance),
          })
          .build(),
      );

      await updateFundingPriority(token);
    },
    [updateFundingPriority, trackEvent, createEventBuilder],
  );

  const isPriorityToken = useCallback(
    (token: CardFundingToken) =>
      Boolean(
        primaryToken &&
          primaryToken.address?.toLowerCase() ===
            token.address?.toLowerCase() &&
          primaryToken.caipChainId === token.caipChainId &&
          primaryToken.walletAddress?.toLowerCase() ===
            token.walletAddress?.toLowerCase(),
      ),
    [primaryToken],
  );

  const handleTokenPress = useCallback(
    async (token: CardFundingToken) => {
      if (selectionOnly) {
        if (onTokenSelect) {
          onTokenSelect(token);
          sheetRef.current?.onCloseBottomSheet();
          return;
        }

        closeBottomSheetAndNavigate(() => {
          if (callerRoute) {
            navigation.navigate(callerRoute, {
              ...callerParams,
              returnedSelectedToken: token,
            });
          } else {
            navigation.goBack();
          }
        });
        return;
      }

      const isAlreadyPriorityToken = isPriorityToken(token);

      if (isAlreadyPriorityToken) {
        if (navigateToCardHomeOnPriorityToken) {
          closeBottomSheetAndNavigate(() => {
            navigation.navigate(Routes.CARD.HOME);
          });
        } else {
          sheetRef.current?.onCloseBottomSheet();
        }
      } else if (
        token.fundingStatus === FundingStatus.Enabled ||
        token.fundingStatus === FundingStatus.Limited
      ) {
        await updatePriority(token);
      } else {
        closeBottomSheetAndNavigate(() => {
          navigation.navigate(Routes.CARD.SPENDING_LIMIT, {
            flow: 'enable',
            selectedToken: token,
          });
        });
      }
    },
    [
      selectionOnly,
      onTokenSelect,
      closeBottomSheetAndNavigate,
      callerRoute,
      navigation,
      callerParams,
      isPriorityToken,
      navigateToCardHomeOnPriorityToken,
      updatePriority,
    ],
  );

  const renderNetworkFilterChip = useCallback(
    ({
      label,
      chainId,
      imageSource,
      isSelected,
      onPress,
      testID,
    }: {
      label: string;
      chainId?: string;
      imageSource?: ImageOrSvgSrc;
      isSelected: boolean;
      onPress: () => void;
      testID: string;
    }) => (
      <ButtonToggle
        label={
          imageSource ? (
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              gap={2}
            >
              <AvatarNetwork
                src={imageSource}
                size={AvatarNetworkSize.Xs}
                name={label}
                shape={AvatarBaseShape.Square}
                twClassName="rounded translate-y-px"
                testID={
                  chainId
                    ? `${testID}-avatar-${safeFormatChainIdToHex(chainId)}`
                    : undefined
                }
              />
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Medium}
                color={
                  isSelected ? TextColor.PrimaryInverse : TextColor.TextDefault
                }
              >
                {label}
              </Text>
            </Box>
          ) : (
            label
          )
        }
        isActive={isSelected}
        onPress={onPress}
        size={ButtonToggleSize.Md}
        style={tw.style('rounded-xl py-2 px-3')}
        testID={testID}
      />
    ),
    [tw],
  );

  const renderNetworkFilter = useCallback(() => {
    if (!showNetworkFilter) {
      return null;
    }

    return (
      <Box
        twClassName="pt-2 pb-4 pl-4"
        testID={AssetSelectionBottomSheetSelectors.NETWORK_FILTER_BAR}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={tw.style('flex-grow-0')}
          contentContainerStyle={tw.style('flex-row items-center gap-2 pr-4')}
        >
          {renderNetworkFilterChip({
            label: strings('card.asset_selection.all'),
            isSelected: selectedNetworkFilter === NETWORK_FILTER_ALL,
            onPress: () => setSelectedNetworkFilter(NETWORK_FILTER_ALL),
            testID: AssetSelectionBottomSheetSelectors.NETWORK_FILTER_ALL,
          })}
          {networkFilterOptions.map((option) => (
            <React.Fragment key={option.caipChainId}>
              {renderNetworkFilterChip({
                label: option.label,
                chainId: option.caipChainId,
                imageSource: option.imageSource,
                isSelected: selectedNetworkFilter === option.caipChainId,
                onPress: () => setSelectedNetworkFilter(option.caipChainId),
                testID: AssetSelectionBottomSheetSelectors.getNetworkFilter(
                  option.caipChainId,
                ),
              })}
            </React.Fragment>
          ))}
        </ScrollView>
      </Box>
    );
  }, [
    networkFilterOptions,
    renderNetworkFilterChip,
    selectedNetworkFilter,
    showNetworkFilter,
    tw,
  ]);

  const renderTokenItem = useCallback(
    ({ item }: { item: AssetSelectionToken }) => {
      const isCurrentPriority = isPriorityToken(item);
      const displaySymbol = getTokenDisplaySymbol(item);
      const displayName = getTokenDisplayName(item);
      const fundingStatusText = getFundingStatusText(item.fundingStatus);
      const walletLabel =
        !item.isMoneyAccountEntry && item.walletAddress
          ? truncateAddress(item.walletAddress, 6)
          : undefined;
      const tokenAvatar = (
        <AvatarToken
          src={getTokenIconSource(item)}
          name={displaySymbol}
          size={AvatarTokenSize.Lg}
          testID={
            item.isMoneyAccountEntry
              ? AssetSelectionBottomSheetSelectors.MONEY_ACCOUNT_ICON
              : undefined
          }
        />
      );

      return (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityState={{ selected: isCurrentPriority }}
          activeOpacity={0.65}
          onPress={() => handleTokenPress(item)}
          testID={AssetSelectionBottomSheetSelectors.getAssetItem(
            item.symbol,
            item.caipChainId,
          )}
          style={tw.style(
            'w-full flex-row items-center justify-between py-3 max-w-full',
            isCurrentPriority ? 'bg-pressed' : 'bg-transparent',
          )}
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="px-4 flex-1 min-w-0"
          >
            <Box twClassName="h-12 justify-center">
              {item.isMoneyAccountEntry ? (
                tokenAvatar
              ) : (
                <BadgeWrapper
                  position={BadgeWrapperPosition.BottomRight}
                  badge={
                    <BadgeNetwork
                      testID={AssetSelectionBottomSheetSelectors.getAssetNetworkBadge(
                        item.symbol,
                        item.caipChainId,
                      )}
                      src={
                        getNetworkImageSource({
                          chainId: item.caipChainId,
                        }) as ImageOrSvgSrc
                      }
                      name={mapCaipChainIdToChainName(item.caipChainId)}
                    />
                  }
                >
                  {tokenAvatar}
                </BadgeWrapper>
              )}
            </Box>

            <Box twClassName="ml-4 justify-center flex-1 min-w-0">
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Medium}
                numberOfLines={1}
              >
                {displayName}
              </Text>
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
                numberOfLines={1}
              >
                {fundingStatusText}
              </Text>
              {walletLabel ? (
                <Text
                  variant={TextVariant.BodyXs}
                  color={TextColor.TextAlternative}
                  numberOfLines={1}
                >
                  {walletLabel}
                </Text>
              ) : null}
            </Box>
          </Box>

          <Box twClassName="px-4 justify-center items-end shrink-0 max-w-[40%]">
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
              numberOfLines={1}
            >
              {item.balanceFiat}
            </Text>
            {item.isMoneyAccountEntry ? null : (
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
                numberOfLines={1}
              >
                {item.balance} {displaySymbol}
              </Text>
            )}
          </Box>
        </TouchableOpacity>
      );
    },
    [handleTokenPress, isPriorityToken, tw],
  );

  const renderFilteredEmptyState = useCallback(
    () => (
      <Box
        twClassName="items-center py-8 px-4"
        testID={AssetSelectionBottomSheetSelectors.EMPTY_FILTER_RESULTS}
      >
        <Text variant={TextVariant.BodyMd} twClassName="text-center mb-4">
          {strings('card.no_tokens_found')}
        </Text>
        <Button
          variant={ButtonVariant.Secondary}
          onPress={clearFilters}
          testID={AssetSelectionBottomSheetSelectors.CLEAR_FILTERS_BUTTON}
        >
          {strings('card.clear_filters')}
        </Button>
      </Box>
    ),
    [clearFilters],
  );

  const renderBottomSheetContent = useCallback(() => {
    if (!cardHomeData?.delegationSettings) {
      return (
        <Box
          twClassName="flex-1 items-center justify-center py-8"
          testID={AssetSelectionBottomSheetSelectors.LOADING}
        >
          <Spinner />
        </Box>
      );
    }

    if (supportedTokensWithBalances.length === 0) {
      return (
        <Box twClassName="flex-1 items-center justify-center py-8 px-4">
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            twClassName="text-center"
          >
            {strings('card.no_tokens_available')}
          </Text>
        </Box>
      );
    }

    return (
      <Box twClassName="flex-1">
        <Box
          twClassName="w-full px-4 pb-2"
          testID={AssetSelectionBottomSheetSelectors.SEARCH_INPUT}
        >
          <TextFieldSearch
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={strings('card.search_tokens')}
            onPressClearButton={() => setSearchQuery('')}
            testID={AssetSelectionBottomSheetSelectors.SEARCH_INPUT_FIELD}
            autoComplete="off"
            autoCorrect={false}
            autoCapitalize="none"
          />
        </Box>
        {renderNetworkFilter()}
        <FlatList
          scrollEnabled
          showsVerticalScrollIndicator={false}
          data={filteredTokens}
          renderItem={renderTokenItem}
          ListEmptyComponent={
            hasActiveFilters ? renderFilteredEmptyState : undefined
          }
          keyExtractor={(item) =>
            `${item.address}-${item.symbol}-${
              item.walletAddress
            }-${safeFormatChainIdToHex(item.caipChainId)}-${
              item.isMoneyAccountEntry ? 'money' : 'wallet'
            }`
          }
        />
      </Box>
    );
  }, [
    cardHomeData?.delegationSettings,
    filteredTokens,
    hasActiveFilters,
    renderFilteredEmptyState,
    renderNetworkFilter,
    renderTokenItem,
    searchQuery,
    supportedTokensWithBalances.length,
  ]);

  return (
    <BottomSheet
      isFullscreen
      ref={sheetRef}
      shouldNavigateBack
      keyboardAvoidingViewEnabled={false}
    >
      <HeaderCompactStandard
        title={strings('card.select_asset')}
        onClose={() => sheetRef.current?.onCloseBottomSheet()}
      />
      {renderBottomSheetContent()}
    </BottomSheet>
  );
};

export default AssetSelectionBottomSheet;
