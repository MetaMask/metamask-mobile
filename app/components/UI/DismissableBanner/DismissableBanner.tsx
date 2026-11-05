import React from 'react';
import { Pressable } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  ButtonIcon,
  ButtonIconSize,
  FontWeight,
  IconColor,
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../locales/i18n';

export const DISMISSABLE_BANNER_TEST_ID = 'dismissable-banner';
export const DISMISSABLE_BANNER_DISMISS_TEST_ID = 'dismissable-banner-dismiss';

export interface DismissableBannerProps {
  /** Primary line of copy. */
  title: string;
  /** Secondary line of copy. */
  description: string;
  /** Called when the banner body is pressed. */
  onPress: () => void;
  /** Called when the close button is pressed. */
  onDismiss: () => void;
  /** Optional leading visual, rendered before the copy. */
  icon?: React.ReactNode;
  /** Overrides the default test ID of the banner container. */
  testID?: string;
  /** Overrides the default test ID of the close button. */
  dismissTestID?: string;
}

/**
 * Compact, tappable banner with a title, a description and a close button.
 * Persisting the dismissal is the responsibility of the caller.
 */
export const DismissableBanner = ({
  title,
  description,
  onPress,
  onDismiss,
  icon,
  testID = DISMISSABLE_BANNER_TEST_ID,
  dismissTestID = DISMISSABLE_BANNER_DISMISS_TEST_ID,
}: DismissableBannerProps) => {
  const tw = useTailwind();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={tw.style('min-h-[72px] mx-4 mb-2 rounded-xl bg-muted px-4 py-3')}
      testID={testID}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
      >
        {icon ? <Box twClassName="mr-4">{icon}</Box> : null}
        <Box twClassName="flex-1 min-w-0">
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
          >
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextDefault}
              fontWeight={FontWeight.Medium}
              numberOfLines={1}
              twClassName="flex-1 min-w-0"
            >
              {title}
            </Text>
            <ButtonIcon
              iconName={IconName.Close}
              size={ButtonIconSize.Sm}
              onPress={onDismiss}
              accessibilityLabel={strings('navigation.close')}
              iconProps={{ color: IconColor.IconDefault }}
              twClassName="ml-2"
              testID={dismissTestID}
            />
          </Box>
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            numberOfLines={1}
          >
            {description}
          </Text>
        </Box>
      </Box>
    </Pressable>
  );
};

export default DismissableBanner;
