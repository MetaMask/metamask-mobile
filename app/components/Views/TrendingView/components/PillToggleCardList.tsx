import React, { useState } from 'react';
import { Box } from '@metamask/design-system-react-native';
import type { ListRenderItem } from '@shopify/flash-list';
import PillRow, { type PillOption } from './PillRow';
import CardList from './CardList';

export interface PillToggleCardListTab<T> {
  key: string;
  name: string;
  items: T[];
}

export interface PillToggleCardListProps<T> {
  tabs: PillToggleCardListTab<T>[];
  isLoading: boolean;
  renderItem: ListRenderItem<T>;
  Skeleton: React.ComponentType;
  idPrefix: string;
  /** Defaults to first tab. */
  defaultPillKey?: string;
  testIdPrefix?: string;
  listTestId?: string;
}

const DEFAULT_TEST_ID_PREFIX = 'pill-toggle-card-list';

/**
 * Pill selector + card list composition. The active pill's `items` are passed
 * to {@link CardList}. Used for perps "stocks vs commodities vs forex" toggles.
 */
function PillToggleCardList<T>({
  tabs,
  isLoading,
  renderItem,
  Skeleton,
  idPrefix,
  defaultPillKey,
  testIdPrefix = DEFAULT_TEST_ID_PREFIX,
  listTestId,
}: PillToggleCardListProps<T>) {
  const firstKey = tabs[0]?.key ?? '';
  const [activeKey, setActiveKey] = useState(defaultPillKey ?? firstKey);
  const active = tabs.find((p) => p.key === activeKey) ?? tabs[0];
  const pills: PillOption[] = tabs.map(({ key, name }) => ({ key, name }));

  return (
    <Box testID={testIdPrefix} twClassName="mt-2 mb-9">
      <PillRow
        pills={pills}
        activeKey={activeKey}
        onSelect={setActiveKey}
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
