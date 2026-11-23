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
import CapsuleGlass from '../../../../../component-library/components-temp/CapsuleGlass';
import { TrendingViewSelectorsIDs } from '../../TrendingView.testIds';

interface BrowserTabsButtonProps {
  tabCount: number;
  onPress: () => void;
  testID?: string;
  /** Draws the button as a Liquid Glass capsule at the search bar's height. */
  isGlass?: boolean;
}

const BrowserTabsButton: React.FC<BrowserTabsButtonProps> = ({
  tabCount,
  onPress,
  testID,
  isGlass = false,
}) => {
  const content = (
    <>
      <Icon
        name={IconName.Global}
        size={IconSize.Md}
        color={IconColor.IconAlternative}
      />
      <Text variant={TextVariant.BodyMd}>{tabCount}</Text>
    </>
  );

  return (
    <TouchableOpacity
      onPress={onPress}
      // Glass draws its own press response and renders wrong when faded.
      activeOpacity={isGlass ? 1 : undefined}
      accessibilityRole="button"
      accessibilityLabel={strings('browser.opened_tabs')}
      testID={testID}
    >
      {isGlass ? (
        <CapsuleGlass
          twClassName="h-12 gap-1 px-3"
          testID={TrendingViewSelectorsIDs.BROWSER_TABS_BUTTON_GLASS}
        >
          {content}
        </CapsuleGlass>
      ) : (
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="h-12 gap-1 rounded-full border border-border-muted bg-muted px-3"
        >
          {content}
        </Box>
      )}
    </TouchableOpacity>
  );
};

export default BrowserTabsButton;
