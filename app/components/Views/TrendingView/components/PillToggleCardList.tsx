import React, { useState } from 'react';
import { Box } from '@metamask/design-system-react-native';
import type { ListRenderItem } from '@shopify/flash-list';
import PillRow, { type PillOption } from './PillRow';
import CardList from './CardList';

export interface PillToggleCardListTab<T, K extends string = string> {
  key: K;
  name: string;
  items: T[];
}

export interface PillToggleCardListProps<T, K extends string = string> {
  tabs: PillToggleCardListTab<T, K>[];
  isLoading: boolean;
  renderItem: ListRenderItem<T>;
  Skeleton: React.ComponentType;
  idPrefix: string;
  /** Defaults to first tab. */
  defaultPillKey?: K;
  /** Called whenever the active pill changes. */
  onPillChange?: (key: K) => void;
  testIdPrefix?: string;
  listTestId?: string;
}

const DEFAULT_TEST_ID_PREFIX = 'pill-toggle-card-list';

/**
 * Pill selector + card list composition. The active pill's `items` are passed
 * to {@link CardList}. Used for perps "stocks vs commodities vs forex" toggles.
 */
function PillToggleCardList<T, K extends string = string>({
  tabs,
  isLoading,
  renderItem,
  Skeleton,
  idPrefix,
  defaultPillKey,
  onPillChange,
  testIdPrefix = DEFAULT_TEST_ID_PREFIX,
  listTestId,
}: PillToggleCardListProps<T, K>) {
  const firstKey = tabs[0]?.key ?? ('' as K);
  const [activeKey, setActiveKey] = useState<K>(defaultPillKey ?? firstKey);
  const active = tabs.find((p) => p.key === activeKey) ?? tabs[0];
  const pills: PillOption[] = tabs.map(({ key, name }) => ({ key, name }));

  const handleSelect = (key: string) => {
    setActiveKey(key as K);
    onPillChange?.(key as K);
  };

  return (
    <Box testID={testIdPrefix} twClassName="mt-2 mb-9">
      <PillRow
        pills={pills}
        activeKey={activeKey}
        onSelect={handleSelect}
        testIdPrefix={testIdPrefix}
      />
      <CardList<T>
        data={active?.items ?? []}
        isLoading={isLoading}
        renderItem={renderItem}
        Skeleton={Skeleton}
        idPrefix={idPrefix}
        listTestId={listTestId}
      />
    </Box>
  );
}

export default PillToggleCardList;
