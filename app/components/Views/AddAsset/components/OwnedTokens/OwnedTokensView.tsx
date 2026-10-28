import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Image, InteractionManager, Platform } from 'react-native';
import { useSelector } from 'react-redux';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { CaipChainId } from '@metamask/utils';
import { strings } from '../../../../../../locales/i18n';
import ListItemMultiSelect from '../../../../../component-library/components/List/ListItemMultiSelect';
import { Skeleton } from '../../../../../component-library/components-temp/Skeleton';
import NotificationManager from '../../../../../core/NotificationManager';
import emptyStateDefiDark from '../../../../../images/empty-state-defi-dark.png';
import emptyStateDefiLight from '../../../../../images/empty-state-defi-light.png';
import { selectNetworkConfigurationsByCaipChainId } from '../../../../../selectors/networkController';
import { useAssetFromTheme } from '../../../../../util/theme';
import { ImportTokenViewSelectorsIDs } from '../../ImportAssetView.testIds';
import CategoryPillRow from './CategoryPillRow';
import OwnedTokenRow from './OwnedTokenRow';
import { useOwnedTokens } from './useOwnedTokens';
import {
  buildOwnedTokenRows,
  type OwnedTokenCategory,
} from './ownedTokenModel';

type CategoryFilter = 'all' | OwnedTokenCategory;

const FILTERS: { key: CategoryFilter; labelKey: string }[] = [
  { key: 'all', labelKey: 'add_asset.owned_tokens.filter_all' },
  { key: 'hidden', labelKey: 'add_asset.owned_tokens.filter_hidden' },
  { key: 'undetected', labelKey: 'add_asset.owned_tokens.filter_undetected' },
];

const SECTION: Record<
  OwnedTokenCategory,
  { labelKey: string; icon: IconName }
> = {
  hidden: {
    labelKey: 'add_asset.owned_tokens.tag_hidden',
    icon: IconName.EyeSlash,
  },
  undetected: {
    labelKey: 'add_asset.owned_tokens.tag_undetected',
    icon: IconName.Search,
  },
};

const OwnedTokenSection = ({
  category,
  count,
}: {
  category: OwnedTokenCategory;
  count: number;
}) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    twClassName="gap-2 px-4 pb-1 pt-4"
    testID={`owned-tokens-section-${category}`}
  >
    <Icon
      name={SECTION[category].icon}
      size={IconSize.Sm}
      color={IconColor.IconAlternative}
    />
    <Text
      variant={TextVariant.BodySm}
      fontWeight={FontWeight.Medium}
      color={TextColor.TextAlternative}
    >
      {`${strings(SECTION[category].labelKey)} \u00B7 ${count}`}
    </Text>
  </Box>
);

const SkeletonRow = () => {
  const tw = useTailwind();

  return (
    <ListItemMultiSelect isDisabled gap={20} style={tw.style('py-0')}>
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="flex-1 h-16"
      >
        <Box twClassName="relative">
          <Skeleton width={40} height={40} style={tw.style('rounded-[20px]')} />
          <Skeleton
            width={20}
            height={20}
            style={tw.style('absolute -bottom-1 -right-1 rounded-[10px]')}
          />
        </Box>
        <Box twClassName="flex-1 ml-5 justify-center">
          <Skeleton width={160} height={20} style={tw.style('rounded-md')} />
          <Skeleton
            width={64}
            height={16}
            style={tw.style('mt-1 rounded-md')}
          />
        </Box>
      </Box>
    </ListItemMultiSelect>
  );
};

const OwnedTokensEmpty = ({ isFiltered }: { isFiltered: boolean }) => {
  const tw = useTailwind();
  const tokensImage = useAssetFromTheme(
    emptyStateDefiLight,
    emptyStateDefiDark,
  );

  return (
    <Box
      twClassName="flex-1 justify-center items-center px-[30px]"
      testID={ImportTokenViewSelectorsIDs.OWNED_TOKENS_EMPTY}
    >
      <Image
        source={tokensImage}
        resizeMode="contain"
        style={tw.style('w-[72px] h-[72px]')}
      />
      <Text
        variant={TextVariant.BodyMd}
        color={TextColor.TextAlternative}
        twClassName="text-center"
      >
        {strings(
          isFiltered
            ? 'add_asset.owned_tokens.empty_filter_body'
            : 'add_asset.owned_tokens.empty_body',
        )}
      </Text>
    </Box>
  );
};

const OwnedTokensView = () => {
  const tw = useTailwind();
  const { tokens, isLoading, isError, refetch, addTokens } = useOwnedTokens();
  const networkConfigurations = useSelector(
    selectNetworkConfigurationsByCaipChainId,
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState(false);

  useEffect(() => {
    setSelectedIds((current) => {
      const valid = new Set<string>(tokens.map((token) => token.assetId));
      const next = new Set([...current].filter((id) => valid.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [tokens]);

  const searchedTokens = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return tokens;
    }
    return tokens.filter(
      (token) =>
        token.name.toLowerCase().includes(query) ||
        token.symbol.toLowerCase().includes(query) ||
        token.address.toLowerCase().includes(query),
    );
  }, [tokens, searchQuery]);

  const pills = useMemo(() => {
    const counts: Record<CategoryFilter, number> = {
      all: searchedTokens.length,
      hidden: 0,
      undetected: 0,
    };
    searchedTokens.forEach((token) => {
      counts[token.category] += 1;
    });
    return FILTERS.map((filter) => ({
      key: filter.key,
      name: `${strings(filter.labelKey)} ${counts[filter.key]}`,
    }));
  }, [searchedTokens]);

  const visibleTokens = useMemo(
    () =>
      category === 'all'
        ? searchedTokens
        : searchedTokens.filter((token) => token.category === category),
    [searchedTokens, category],
  );

  const listRows = useMemo(
    () => buildOwnedTokenRows(visibleTokens, category),
    [visibleTokens, category],
  );

  const selectedTokens = useMemo(
    () => tokens.filter((token) => selectedIds.has(token.assetId)),
    [tokens, selectedIds],
  );

  const toggleToken = useCallback((assetId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(assetId)) {
        next.delete(assetId);
      } else {
        next.add(assetId);
      }
      return next;
    });
  }, []);

  const handleAdd = useCallback(async () => {
    if (selectedTokens.length === 0 || isAdding) {
      return;
    }
    setIsAdding(true);
    setAddError(false);
    const pending = selectedTokens;
    try {
      const result = await addTokens(pending);
      if (result.addedAssetIds.length > 0) {
        const addedSymbols = pending
          .filter((token) => result.addedAssetIds.includes(token.assetId))
          .map((token) => token.symbol);
        setSelectedIds((current) => {
          const next = new Set(current);
          result.addedAssetIds.forEach((assetId) => next.delete(assetId));
          return next;
        });
        InteractionManager.runAfterInteractions(() => {
          NotificationManager.showSimpleNotification({
            status: 'import_success',
            duration: 5000,
            title: strings('add_asset.owned_tokens.added_title'),
            description:
              result.addedAssetIds.length === 1
                ? strings('add_asset.owned_tokens.added_one', {
                    symbol: addedSymbols[0] ?? '',
                  })
                : strings('add_asset.owned_tokens.added_many', {
                    count: result.addedAssetIds.length,
                  }),
          });
        });
      }
      setAddError(result.failed > 0);
    } catch {
      setAddError(true);
    } finally {
      setIsAdding(false);
    }
  }, [addTokens, isAdding, selectedTokens]);

  const networkNameFor = useCallback(
    (chainId: CaipChainId) => networkConfigurations[chainId]?.name ?? chainId,
    [networkConfigurations],
  );

  const header = (
    <CategoryPillRow
      pills={pills}
      activeKey={category}
      onSelect={(key) => setCategory(key as CategoryFilter)}
      testIdPrefix="owned-tokens"
      search={{
        value: searchQuery,
        onChangeText: setSearchQuery,
        placeholder: strings('add_asset.owned_tokens.search_placeholder'),
        testID: ImportTokenViewSelectorsIDs.OWNED_TOKENS_SEARCH,
      }}
    />
  );

  if (isLoading) {
    return (
      <Box
        twClassName="flex-1"
        testID={ImportTokenViewSelectorsIDs.OWNED_TOKENS_VIEW}
      >
        {header}
        <Box testID="owned-tokens-loading">
          {[0, 1, 2, 3, 4, 5].map((row) => (
            <SkeletonRow key={row} />
          ))}
        </Box>
      </Box>
    );
  }

  if (isError) {
    return (
      <Box
        twClassName="flex-1 items-center justify-center px-6"
        testID={ImportTokenViewSelectorsIDs.OWNED_TOKENS_ERROR}
      >
        <Icon
          name={IconName.Warning}
          size={IconSize.Xl}
          color={IconColor.WarningDefault}
        />
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          twClassName="mt-3 text-center"
        >
          {strings('add_asset.owned_tokens.error')}
        </Text>
        <Box twClassName="mt-4 w-full">
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Lg}
            isFullWidth
            onPress={() => {
              refetch();
            }}
            testID={ImportTokenViewSelectorsIDs.OWNED_TOKENS_RETRY}
          >
            {strings('add_asset.owned_tokens.retry')}
          </Button>
        </Box>
      </Box>
    );
  }

  const isFiltered = searchQuery.trim().length > 0 || category !== 'all';
  const selectedCount = selectedTokens.length;

  return (
    <Box
      twClassName="flex-1"
      testID={ImportTokenViewSelectorsIDs.OWNED_TOKENS_VIEW}
    >
      {header}
      <FlatList
        style={tw.style('flex-1')}
        data={listRows}
        keyExtractor={(row) =>
          row.kind === 'section' ? `section-${row.id}` : row.token.assetId
        }
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={tw.style(
          'pb-4',
          listRows.length === 0 && 'flex-1',
        )}
        renderItem={({ item }) =>
          item.kind === 'section' ? (
            <OwnedTokenSection category={item.id} count={item.count} />
          ) : (
            <OwnedTokenRow
              token={item.token}
              networkName={networkNameFor(item.token.chainId)}
              isSelected={selectedIds.has(item.token.assetId)}
              onToggle={toggleToken}
            />
          )
        }
        ListEmptyComponent={<OwnedTokensEmpty isFiltered={isFiltered} />}
      />

      <Box style={tw.style('px-4 pt-6', Platform.OS !== 'android' && 'pb-4')}>
        {addError ? (
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.ErrorDefault}
            twClassName="mb-3"
            testID="owned-tokens-add-error"
          >
            {strings('add_asset.owned_tokens.add_failed')}
          </Text>
        ) : null}
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          isDisabled={selectedCount === 0 || isAdding}
          isLoading={isAdding}
          onPress={handleAdd}
          testID={ImportTokenViewSelectorsIDs.OWNED_TOKENS_ADD}
        >
          {selectedCount > 1
            ? strings('add_asset.owned_tokens.add_many', {
                count: selectedCount,
              })
            : strings('add_asset.owned_tokens.add_one')}
        </Button>
      </Box>
    </Box>
  );
};

export default OwnedTokensView;
