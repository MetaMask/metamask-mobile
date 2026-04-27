import React, { useCallback, useMemo } from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import {
  Box,
  BoxFlexDirection,
  BoxJustifyContent,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';
import { useAppThemeFromContext } from '../../../../../../util/theme';
import type { Theme } from '../../../../../../util/theme/models';
import { SECTIONS_CONFIG, type SectionId } from '../../../sections.config';
import type { ExploreKeyedMarketsSectionPayload } from '../../../sections/predictions.sections';
import { strings } from '../../../../../../../locales/i18n';
import PillRow from './PillRow';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

const readKeyedMarketsPayload = (
  data: unknown[],
): ExploreKeyedMarketsSectionPayload | undefined => {
  const first = data[0];
  if (!isRecord(first)) {
    return undefined;
  }
  if (!Array.isArray(first.pills) || !isRecord(first.marketsByKey)) {
    return undefined;
  }
  if (typeof first.activeKey !== 'string') {
    return undefined;
  }
  if (typeof first.selectSport !== 'function') {
    return undefined;
  }
  return first as unknown as ExploreKeyedMarketsSectionPayload;
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    loadMore: { color: theme.colors.primary.default },
  });

interface AllSportsPillSectionProps {
  sectionId: SectionId;
  data: unknown[];
  isLoading: boolean;
}

const AllSportsPillSection: React.FC<AllSportsPillSectionProps> = ({
  sectionId,
  data,
}) => {
  const payload = readKeyedMarketsPayload(data);
  const navigation = useNavigation();
  const theme = useAppThemeFromContext();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const section = SECTIONS_CONFIG[sectionId];

  const pills = payload?.pills ?? [];
  const activeKey = payload?.activeKey ?? pills[0]?.key ?? '';

  const selectSport = payload?.selectSport;
  const handleSelectPill = useCallback(
    (key: string) => {
      selectSport?.(key);
    },
    [selectSport],
  );

  const active =
    payload !== undefined ? payload.marketsByKey[payload.activeKey] : undefined;

  const renderItem: ListRenderItem<unknown> = useCallback(
    ({ item, index }) => (
      <section.RowItem item={item} index={index} navigation={navigation} />
    ),
    [navigation, section],
  );

  const keyExtractor = useCallback(
    (_: unknown, index: number) => `${sectionId}-${activeKey}-${index}`,
    [sectionId, activeKey],
  );

  const showSkeleton =
    payload === undefined ||
    active === undefined ||
    (active.isFetching && active.marketData.length === 0);

  return (
    <Box twClassName="mb-6">
      <PillRow
        pills={pills}
        activeKey={activeKey}
        onSelect={handleSelectPill}
        testIdPrefix="all-sports"
      />

      {showSkeleton ? (
        <Box twClassName="gap-2">
          {[0, 1, 2].map((i) => (
            <Box
              key={`all-sports-skeleton-${i}`}
              twClassName="h-[220px] w-full overflow-hidden rounded-2xl"
            >
              <section.Skeleton />
            </Box>
          ))}
        </Box>
      ) : (
        <>
          <FlashList
            data={active.marketData}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            scrollEnabled={false}
            keyboardShouldPersistTaps="handled"
            testID={`all-sports-list-${activeKey}`}
          />

          {active.hasMore && (
            <Box
              flexDirection={BoxFlexDirection.Row}
              justifyContent={BoxJustifyContent.Center}
              twClassName="mt-3"
            >
              <TouchableOpacity
                onPress={active.fetchMore}
                disabled={active.isFetchingMore}
                testID="all-sports-load-more"
              >
                {active.isFetchingMore ? (
                  <ActivityIndicator color={theme.colors.primary.default} />
                ) : (
                  <Text
                    variant={TextVariant.BodySm}
                    fontWeight={FontWeight.Medium}
                    color={TextColor.PrimaryDefault}
                    style={styles.loadMore}
                  >
                    {strings('trending.load_more')}
                  </Text>
                )}
              </TouchableOpacity>
            </Box>
          )}
        </>
      )}
    </Box>
  );
};

export default AllSportsPillSection;
