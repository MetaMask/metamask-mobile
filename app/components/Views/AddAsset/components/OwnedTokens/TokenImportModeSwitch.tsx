import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { ImportTokenViewSelectorsIDs } from '../../ImportAssetView.testIds';

export type TokenImportMode = 'find' | 'owned';

const styles = StyleSheet.create({
  segment: { flex: 1 },
});

interface TokenImportModeSwitchProps {
  mode: TokenImportMode;
  onChange: (mode: TokenImportMode) => void;
}

const SEGMENTS: {
  mode: TokenImportMode;
  labelKey: string;
  icon: IconName;
  testID: string;
}[] = [
  {
    mode: 'find',
    labelKey: 'add_asset.owned_tokens.find_tokens',
    icon: IconName.Search,
    testID: ImportTokenViewSelectorsIDs.MODE_FIND,
  },
  {
    mode: 'owned',
    labelKey: 'add_asset.owned_tokens.tokens_i_own',
    icon: IconName.Wallet,
    testID: ImportTokenViewSelectorsIDs.MODE_OWNED,
  },
];

const TokenImportModeSwitch = ({
  mode,
  onChange,
}: TokenImportModeSwitchProps) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    twClassName="mx-4 mb-2 mt-2 rounded-xl bg-muted p-1"
    testID="import-token-mode-switch"
  >
    {SEGMENTS.map((segment) => {
      const isSelected = mode === segment.mode;
      return (
        <Pressable
          key={segment.mode}
          accessibilityRole="tab"
          accessibilityState={{ selected: isSelected }}
          onPress={() => onChange(segment.mode)}
          testID={segment.testID}
          style={styles.segment}
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName={`h-10 justify-center gap-2 rounded-lg px-3 ${
              isSelected ? 'bg-default' : ''
            }`}
          >
            <Icon
              name={segment.icon}
              size={IconSize.Sm}
              color={
                isSelected ? IconColor.IconDefault : IconColor.IconAlternative
              }
            />
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
              color={
                isSelected ? TextColor.TextDefault : TextColor.TextAlternative
              }
              numberOfLines={1}
            >
              {strings(segment.labelKey)}
            </Text>
          </Box>
        </Pressable>
      );
    })}
  </Box>
);

export default TokenImportModeSwitch;
