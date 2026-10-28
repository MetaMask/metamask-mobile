import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { getHardwareTier } from '../../../../../util/deviceCapability';
import { useNetworkTier } from '../../../../../hooks/useNetworkTier';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { strings } from '../../../../../../locales/i18n';
import { OWNED_TOKENS_EVENTS } from '../../../../../core/Analytics/events/owned-tokens/events';
import {
  countOwnedTokenCategories,
  filterOwnedTokenRows,
} from './model/classifyOwnedTokens';
import type { ClassifiedHolding, OwnedTokenFilter } from './model/types';
import { useOwnedTokens } from './hooks/useOwnedTokens';
import OwnedTokenRow from './OwnedTokenRow';
import OwnedTokensHeader from './OwnedTokensHeader';
import OwnedTokensWarningSheet from './OwnedTokensWarningSheet';
import { OwnedTokensTestIds } from './OwnedTokens.testIds';

const LOW_DRAW_DISTANCE = 180;
const DEFAULT_DRAW_DISTANCE = 400;

/**
 * Device capability for this screen (list + network fetch):
 * - Network `NONE` (any hardware, including unknown hardware): no fetch.
 * - `LOW` hardware or `SLOW_CELLULAR`: smaller list window and serial chunks.
 * - Unknown hardware or unknown network: product default, still fetches.
 * The two tiers are not folded together.
 */
const OwnedTokensList = () => {
  const { trackEvent, createEventBuilder } = useAnalytics();
  const hardwareTier = getHardwareTier();
  const networkTier = useNetworkTier();
  const { tokens, status, unprocessedNetworks, refetch, addTokens, isAdding } =
    useOwnedTokens({ hardwareTier, networkTier });

  const [filter, setFilter] = useState<OwnedTokenFilter>('all');
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [noticeDismissed, setNoticeDismissed] = useState(false);
  const [warningVisible, setWarningVisible] = useState(false);
  const viewedRef = useRef(false);
  const searchedRef = useRef(false);

  const counts = useMemo(() => countOwnedTokenCategories(tokens), [tokens]);
  const visibleRows = useMemo(
    () => filterOwnedTokenRows(tokens, filter, query),
    [filter, query, tokens],
  );
  const selectedRows = useMemo(
    () => tokens.filter((row) => selectedKeys.has(row.rowKey)),
    [selectedKeys, tokens],
  );

  useEffect(() => {
    if (status !== 'success' || viewedRef.current) {
      return;
    }
    viewedRef.current = true;
    trackEvent(
      createEventBuilder(OWNED_TOKENS_EVENTS.LIST_VIEWED)
        .addProperties({
          hidden_count: counts.hidden,
          undetected_count: counts.undetected,
          total_count: counts.all,
        })
        .build(),
    );
  }, [counts, createEventBuilder, status, trackEvent]);

  const onChangeFilter = useCallback(
    (next: OwnedTokenFilter) => {
      setFilter(next);
      if (next !== 'all') {
        trackEvent(
          createEventBuilder(OWNED_TOKENS_EVENTS.FILTER_USED)
            .addProperties({ filter: next })
            .build(),
        );
      }
    },
    [createEventBuilder, trackEvent],
  );

  const onChangeQuery = useCallback(
    (value: string) => {
      setQuery(value);
      if (value.trim() && !searchedRef.current) {
        searchedRef.current = true;
        trackEvent(
          createEventBuilder(OWNED_TOKENS_EVENTS.SEARCH_USED)
            .addProperties({ query_length: value.trim().length })
            .build(),
        );
      }
      if (!value.trim()) {
        searchedRef.current = false;
      }
    },
    [createEventBuilder, trackEvent],
  );

  const onToggle = useCallback((row: ClassifiedHolding) => {
    if (!row.selectable) {
      return;
    }
    setSelectedKeys((current) => {
      const next = new Set(current);
      if (next.has(row.rowKey)) {
        next.delete(row.rowKey);
      } else {
        next.add(row.rowKey);
      }
      return next;
    });
  }, []);

  const runImport = useCallback(async () => {
    const result = await addTokens(selectedRows);
    setSelectedKeys(new Set(result.failedKeys));
    setWarningVisible(false);
    trackEvent(
      createEventBuilder(OWNED_TOKENS_EVENTS.TOKENS_ADDED)
        .addProperties({
          success_count: result.successCount,
          failure_count: result.failureCount,
          hidden_count: result.hiddenCount,
          undetected_count: result.undetectedCount,
        })
        .build(),
    );
  }, [addTokens, createEventBuilder, selectedRows, trackEvent]);

  const onPressAdd = useCallback(() => {
    if (selectedRows.some((row) => row.spamTier === 'warning')) {
      setWarningVisible(true);
      return;
    }
    runImport().catch(() => undefined);
  }, [runImport, selectedRows]);

  const renderItem: ListRenderItem<ClassifiedHolding> = useCallback(
    ({ item }) => (
      <OwnedTokenRow
        row={item}
        isSelected={selectedKeys.has(item.rowKey)}
        onToggle={onToggle}
      />
    ),
    [onToggle, selectedKeys],
  );

  const addLabel =
    selectedRows.length > 1
      ? strings('add_asset.owned_tokens.add_button', {
          count: selectedRows.length,
        })
      : strings('add_asset.owned_tokens.add_token');

  const showNotice =
    unprocessedNetworks.length > 0 && !noticeDismissed && status === 'success';

  let body: React.ReactNode = null;
  if (status === 'pending') {
    body = (
      <Box testID={OwnedTokensTestIds.SKELETON}>
        {Array.from({ length: 6 }, (_item, index) => (
          <Box
            key={index}
            twClassName="mx-4 my-2 h-14 rounded-xl bg-background-alternative"
          />
        ))}
      </Box>
    );
  } else if (status === 'offline') {
    body = (
      <Box
        twClassName="flex-1 items-center justify-center px-6"
        testID={OwnedTokensTestIds.OFFLINE}
      >
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {strings('add_asset.owned_tokens.offline')}
        </Text>
      </Box>
    );
  } else if (status === 'error') {
    body = (
      <Box
        twClassName="flex-1 items-center justify-center px-6"
        testID={OwnedTokensTestIds.ERROR}
      >
        <Text variant={TextVariant.BodyMd} twClassName="mb-3">
          {strings('add_asset.owned_tokens.error')}
        </Text>
        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Lg}
          onPress={() => {
            refetch().catch(() => undefined);
          }}
          testID={OwnedTokensTestIds.RETRY}
        >
          {strings('add_asset.owned_tokens.retry')}
        </Button>
      </Box>
    );
  } else if (visibleRows.length === 0) {
    const emptyKey =
      query.trim() || filter !== 'all'
        ? query.trim()
          ? 'add_asset.owned_tokens.empty_search'
          : 'add_asset.owned_tokens.empty_filter'
        : 'add_asset.owned_tokens.empty';
    body = (
      <Box
        twClassName="flex-1 items-center justify-center px-6"
        testID={OwnedTokensTestIds.EMPTY}
      >
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {strings(emptyKey)}
        </Text>
      </Box>
    );
  } else {
    body = (
      <FlashList
        data={visibleRows}
        renderItem={renderItem}
        keyExtractor={(item) => item.rowKey}
        drawDistance={
          hardwareTier === 'LOW' ? LOW_DRAW_DISTANCE : DEFAULT_DRAW_DISTANCE
        }
        testID={OwnedTokensTestIds.LIST}
        keyboardShouldPersistTaps="handled"
      />
    );
  }

  return (
    <Box twClassName="flex-1">
      <OwnedTokensHeader
        searchOpen={searchOpen}
        query={query}
        filter={filter}
        counts={counts}
        onOpenSearch={() => setSearchOpen(true)}
        onCloseSearch={() => {
          setSearchOpen(false);
          onChangeQuery('');
        }}
        onChangeQuery={onChangeQuery}
        onChangeFilter={onChangeFilter}
      />
      {showNotice ? (
        <Box
          twClassName="mx-4 mb-2 flex-row items-center justify-between rounded-xl px-3 py-2"
          testID={OwnedTokensTestIds.NOTICE}
        >
          <Text variant={TextVariant.BodySm} twClassName="flex-1">
            {strings('add_asset.owned_tokens.partial_networks')}
          </Text>
          <Button
            variant={ButtonVariant.Tertiary}
            size={ButtonSize.Sm}
            onPress={() => setNoticeDismissed(true)}
            testID={OwnedTokensTestIds.NOTICE_DISMISS}
          >
            {strings('add_asset.owned_tokens.dismiss')}
          </Button>
        </Box>
      ) : null}
      <Box twClassName="flex-1">{body}</Box>
      <Box twClassName="px-4 py-3">
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          isDisabled={selectedRows.length === 0 || isAdding}
          isLoading={isAdding}
          onPress={onPressAdd}
          testID={OwnedTokensTestIds.ADD_BUTTON}
        >
          {addLabel}
        </Button>
      </Box>
      <OwnedTokensWarningSheet
        visible={warningVisible}
        onCancel={() => setWarningVisible(false)}
        onConfirm={() => {
          runImport().catch(() => undefined);
        }}
      />
    </Box>
  );
};

export default OwnedTokensList;
