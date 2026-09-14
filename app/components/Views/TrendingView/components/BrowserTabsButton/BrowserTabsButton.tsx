import React from 'react';
import { TouchableOpacity } from 'react-native';
import {
  Box,
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

interface BrowserTabsButtonProps {
  tabCount: number;
  onPress: () => void;
  testID?: string;
}

const BrowserTabsButton: React.FC<BrowserTabsButtonProps> = ({
  tabCount,
  onPress,
  testID,
}) => (
  <TouchableOpacity
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={
      tabCount > 0
        ? strings('browser.opened_tabs')
        : strings('browser.add_new_tab')
    }
    testID={testID}
  >
    <Box twClassName="h-12 w-12 items-center justify-center rounded-full border border-border-muted bg-muted">
      {tabCount > 0 ? (
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextDefault}
        >
          {tabCount}
        </Text>
      ) : (
        <Icon
          name={IconName.Explore}
          size={IconSize.Lg}
          color={IconColor.IconDefault}
        />
      )}
    </Box>
  </TouchableOpacity>
);

export default BrowserTabsButton;
