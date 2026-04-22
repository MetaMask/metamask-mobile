import React, { useCallback, useState } from 'react';
import { Pressable } from 'react-native';
import {
  Box,
  Text,
  TextColor,
  TextVariant,
  FontWeight,
  BoxFlexDirection,
  BoxAlignItems,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { SectionId } from '../../../sections.config';
import SectionCard, { type SectionCardProps } from './SectionCard';

/**
 * A named group: localized label + items rendered via `SectionCard` for a section.
 * Keys are arbitrary (e.g. `stocks`, `commodities`) and must appear in `groupOrder`.
 */
export interface PillToggledGroup {
  name: string;
  items: unknown[];
}

export interface PillToggledCardSectionProps
  extends Pick<SectionCardProps, 'listTestId'> {
  sectionId: SectionId;
  isLoading: boolean;
  /** Pills are rendered in this order (left to right). */
  groupOrder: string[];
  groups: Record<string, PillToggledGroup>;
  /** Must exist in `groupOrder`. */
  defaultGroupKey: string;
  /** Base string for E2E; children get suffixes `-pill-<key>`. */
  testIdPrefix?: string;
}

const DEFAULT_TEST_ID_PREFIX = 'pill-toggled-section';

const PillToggledCardSection: React.FC<PillToggledCardSectionProps> = ({
  sectionId,
  isLoading,
  groupOrder,
  groups,
  defaultGroupKey,
  listTestId,
  testIdPrefix = DEFAULT_TEST_ID_PREFIX,
}) => {
  const tw = useTailwind();
  const [activeKey, setActiveKey] = useState(defaultGroupKey);

  const onSelectPill = useCallback((key: string) => {
    setActiveKey(key);
  }, []);

  const activeGroup = groups[activeKey] ?? { name: '', items: [] };

  return (
    <Box testID={testIdPrefix} twClassName="mb-6">
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="mb-3 flex-wrap gap-2"
        testID={`${testIdPrefix}-pills`}
      >
        {groupOrder.map((key) => {
          const group = groups[key];
          if (!group) {
            return null;
          }
          const isSelected = activeKey === key;
          return (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              onPress={() => onSelectPill(key)}
              testID={`${testIdPrefix}-pill-${key}`}
              style={tw.style(
                'rounded-xl px-4 py-2',
                isSelected ? 'bg-icon-default' : 'bg-muted',
              )}
            >
              <Text
                variant={TextVariant.BodySm}
                fontWeight={FontWeight.Medium}
                color={
                  isSelected ? TextColor.InfoInverse : TextColor.TextAlternative
                }
                testID={`${testIdPrefix}-pill-label-${key}`}
              >
                {group.name}
              </Text>
            </Pressable>
          );
        })}
      </Box>
      <SectionCard
        sectionId={sectionId}
        data={activeGroup.items}
        isLoading={isLoading}
        listTestId={listTestId}
      />
    </Box>
  );
};

export default PillToggledCardSection;
