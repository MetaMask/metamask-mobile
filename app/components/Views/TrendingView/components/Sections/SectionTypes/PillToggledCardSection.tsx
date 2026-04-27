import React, { useState } from 'react';
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
 * One pill: stable `key` (E2E), visible `name`, items passed to the section’s `RowItem`s.
 * Order in the parent array = left to right in the UI.
 */
export interface PillToggledTab {
  key: string;
  name: string;
  items: unknown[];
}

export interface PillToggledCardSectionProps
  extends Pick<SectionCardProps, 'listTestId'> {
  sectionId: SectionId;
  isLoading: boolean;
  pills: PillToggledTab[];
  /** If omitted, the first tab is selected. */
  defaultPillKey?: string;
  testIdPrefix?: string;
}

const DEFAULT_TEST_ID_PREFIX = 'pill-toggled-section';

const PillToggledCardSection: React.FC<PillToggledCardSectionProps> = ({
  sectionId,
  isLoading,
  pills,
  defaultPillKey,
  listTestId,
  testIdPrefix = DEFAULT_TEST_ID_PREFIX,
}) => {
  const tw = useTailwind();
  const firstKey = pills[0]?.key ?? '';
  const [activeKey, setActiveKey] = useState(defaultPillKey ?? firstKey);

  const active = pills.find((p) => p.key === activeKey) ?? pills[0];

  return (
    <Box testID={testIdPrefix} twClassName="mb-6">
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="mb-3 flex-wrap gap-2"
        testID={`${testIdPrefix}-pills`}
      >
        {pills.map((pill) => {
          const isSelected = activeKey === pill.key;
          return (
            <Pressable
              key={pill.key}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              onPress={() => setActiveKey(pill.key)}
              testID={`${testIdPrefix}-pill-${pill.key}`}
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
                testID={`${testIdPrefix}-pill-label-${pill.key}`}
              >
                {pill.name}
              </Text>
            </Pressable>
          );
        })}
      </Box>
      <SectionCard
        sectionId={sectionId}
        data={active?.items ?? []}
        isLoading={isLoading}
        listTestId={listTestId}
      />
    </Box>
  );
};

export default PillToggledCardSection;
