import React from 'react';
import { TouchableOpacity } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Icon,
  IconColor,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import QuickBuyTradeModeToggle from './QuickBuyTradeModeToggle';
import { useQuickBuyContext } from '../useQuickBuyContext';

const ToolbarIconButton: React.FC<{
  iconName: IconName;
  onPress: () => void;
  testID: string;
}> = ({ iconName, onPress, testID }) => (
  <TouchableOpacity
    onPress={onPress}
    accessibilityRole="button"
    activeOpacity={0.7}
    testID={testID}
  >
    <Box
      twClassName="h-10 w-10 items-center justify-center rounded-full bg-muted"
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Center}
    >
      <Icon name={iconName} size={IconSize.Md} color={IconColor.IconDefault} />
    </Box>
  </TouchableOpacity>
);

const QuickBuyToolbar: React.FC = () => {
  const { setActiveScreen, features, hasSellableBalance, onClose } =
    useQuickBuyContext();

  const showFullToggle = features.tradeModes.length > 1 && hasSellableBalance;

  return (
    <Box
      twClassName="px-4 pt-2 pb-3"
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
    >
      <Box
        twClassName="flex-1"
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Start}
      >
        <ToolbarIconButton
          iconName={IconName.Setting}
          onPress={() => setActiveScreen('quoteDetails')}
          testID="quick-buy-settings-button"
        />
      </Box>

      <QuickBuyTradeModeToggle buyOnly={!showFullToggle} />

      <Box
        twClassName="flex-1"
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.End}
      >
        <ToolbarIconButton
          iconName={IconName.Close}
          onPress={onClose}
          testID="quick-buy-close-button"
        />
      </Box>
    </Box>
  );
};

export default QuickBuyToolbar;
