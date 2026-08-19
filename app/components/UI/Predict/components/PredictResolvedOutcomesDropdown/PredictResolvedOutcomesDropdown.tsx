import React, { memo, type ReactNode } from 'react';
import { Pressable } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';

interface PredictResolvedOutcomesDropdownProps {
  children: ReactNode;
  count: number;
  isExpanded: boolean;
  onToggle: () => void;
  containerTestID?: string;
  contentTestID?: string;
  countTestID?: string;
  expandedIconTestID?: string;
  collapsedIconTestID?: string;
}

const PredictResolvedOutcomesDropdown = memo(
  ({
    children,
    count,
    isExpanded,
    onToggle,
    containerTestID,
    contentTestID,
    countTestID,
    expandedIconTestID,
    collapsedIconTestID,
  }: PredictResolvedOutcomesDropdownProps) => {
    const tw = useTailwind();

    if (count === 0) {
      return null;
    }

    return (
      <Pressable
        onPress={onToggle}
        style={({ pressed }) =>
          tw.style(
            'w-full rounded-xl bg-muted px-4 py-3 mt-2 mb-4',
            pressed && 'bg-pressed',
          )
        }
        accessibilityRole="button"
        testID={containerTestID}
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Between}
          twClassName="gap-3"
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="gap-2"
          >
            <Text
              variant={TextVariant.BodyMd}
              twClassName="font-medium"
              color={TextColor.TextDefault}
            >
              {strings('predict.resolved_outcomes')}
            </Text>
            <Box twClassName="px-2 py-0.5 rounded bg-muted">
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
                testID={countTestID}
              >
                {count}
              </Text>
            </Box>
          </Box>
          <Icon
            name={isExpanded ? IconName.ArrowUp : IconName.ArrowDown}
            size={IconSize.Md}
            color={IconColor.IconAlternative}
            testID={isExpanded ? expandedIconTestID : collapsedIconTestID}
          />
        </Box>
        {isExpanded && <Box testID={contentTestID}>{children}</Box>}
      </Pressable>
    );
  },
);

PredictResolvedOutcomesDropdown.displayName = 'PredictResolvedOutcomesDropdown';

export default PredictResolvedOutcomesDropdown;
