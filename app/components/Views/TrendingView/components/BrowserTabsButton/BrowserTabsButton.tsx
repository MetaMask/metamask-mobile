import React from 'react';
import { TouchableOpacity } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
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
    accessibilityLabel={strings('browser.opened_tabs')}
    testID={testID}
  >
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName="h-12 gap-1 rounded-full border border-border-muted bg-muted px-3"
    >
      <Icon
        name={IconName.Global}
        size={IconSize.Md}
        color={IconColor.IconAlternative}
      />
      <Text variant={TextVariant.BodyMd}>{tabCount}</Text>
    </Box>
  </TouchableOpacity>
);

export default BrowserTabsButton;
