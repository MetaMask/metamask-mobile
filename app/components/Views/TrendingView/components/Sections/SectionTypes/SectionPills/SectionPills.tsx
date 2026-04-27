import React, { useCallback, useMemo } from 'react';
import { ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { SectionId, SECTIONS_CONFIG } from '../../../../sections.config';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
} from '@metamask/design-system-react-native';
import { AppNavigationProp } from '../../../../../../../core/NavigationService/types';
import SectionPillsSkeleton from './SectionPillsSkeleton';

const DEFAULT_MAX_PILLS = 12;

function splitIntoTwoRows<T>(items: T[]): [T[], T[]] {
  if (items.length === 0) {
    return [[], []];
  }
  const mid = Math.ceil(items.length / 2);
  return [items.slice(0, mid), items.slice(mid)];
}

export interface SectionPillsProps {
  sectionId: SectionId;
  data: unknown[];
  isLoading: boolean;
  /** @default 12 */
  maxPills?: number;
  listTestId?: string;
}

const SectionPills: React.FC<SectionPillsProps> = ({
  sectionId,
  data,
  isLoading,
  maxPills = DEFAULT_MAX_PILLS,
  listTestId,
}) => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const section = SECTIONS_CONFIG[sectionId];

  const listTestID = listTestId ?? `explore-${sectionId}-pills-list`;
  const displayData = useMemo(() => data.slice(0, maxPills), [data, maxPills]);
  const [row1, row2] = useMemo(
    () => splitIntoTwoRows(displayData),
    [displayData],
  );

  const rowRenderer = useCallback(
    (items: unknown[], startIndex: number) =>
      items.map((item, i) => (
        <section.RowItem
          key={section.getItemIdentifier(item)}
          item={item}
          index={startIndex + i}
          navigation={navigation}
        />
      )),
    [section, navigation],
  );

  return (
    <Box marginBottom={5} twClassName="bg-transparent">
      {isLoading && <SectionPillsSkeleton />}
      {!isLoading && (row1.length > 0 || row2.length > 0) && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          testID={listTestID}
          style={tw.style('bg-transparent')}
          contentContainerStyle={tw.style('flex-col pr-0')}
        >
          <Box flexDirection={BoxFlexDirection.Column} twClassName="gap-2">
            {row1.length > 0 ? (
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                twClassName="flex-nowrap gap-2"
              >
                {rowRenderer(row1, 0)}
              </Box>
            ) : null}
            {row2.length > 0 ? (
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                twClassName="flex-nowrap gap-2"
              >
                {rowRenderer(row2, row1.length)}
              </Box>
            ) : null}
          </Box>
        </ScrollView>
      )}
    </Box>
  );
};

export default SectionPills;
