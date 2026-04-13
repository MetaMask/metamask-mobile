import React, { memo, useCallback } from 'react';
import { Pressable, ScrollView } from 'react-native';
import {
  Box,
  Text,
  TextColor,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import {
  PREDICT_OUTCOME_GROUP_CHIPS_TEST_IDS,
  getOutcomeGroupChipTestId,
  getOutcomeGroupChipLabelTestId,
} from './PredictOutcomeGroupChips.testIds';
import type { PredictOutcomeGroupChipsProps } from './PredictOutcomeGroupChips.types';

const I18N_PREFIX = 'predict.outcome_groups';

/**
 * Resolves a group key to a display label via i18n.
 * Falls back to title-casing the key if no translation exists.
 */
const getGroupLabel = (key: string): string => {
  const i18nKey = `${I18N_PREFIX}.${key}`;
  const label = strings(i18nKey);
  if (label !== i18nKey) {
    return label;
  }
  return key
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const PredictOutcomeGroupChips: React.FC<PredictOutcomeGroupChipsProps> = ({
  groups,
  selectedGroupKey,
  onGroupSelect,
  testID = PREDICT_OUTCOME_GROUP_CHIPS_TEST_IDS.CONTAINER,
}) => {
  const tw = useTailwind();

  const handlePress = useCallback(
    (key: string) => {
      onGroupSelect(key);
    },
    [onGroupSelect],
  );

  if (groups.length === 0) {
    return null;
  }

  return (
    <Box testID={testID} twClassName="py-4">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={tw.style('px-4 gap-2')}
      >
        {groups.map((group) => {
          const isSelected = group.key === selectedGroupKey;
          return (
            <Pressable
              key={group.key}
              onPress={() => handlePress(group.key)}
              style={tw.style(
                'rounded-xl px-4 py-2',
                isSelected ? 'bg-icon-default' : 'bg-muted',
              )}
              testID={getOutcomeGroupChipTestId(group.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
            >
              <Text
                variant={TextVariant.BodySm}
                fontWeight={FontWeight.Medium}
                color={
                  isSelected ? TextColor.InfoInverse : TextColor.TextAlternative
                }
                testID={getOutcomeGroupChipLabelTestId(group.key)}
              >
                {getGroupLabel(group.key)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </Box>
  );
};

export default memo(PredictOutcomeGroupChips);
