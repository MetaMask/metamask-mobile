import React from 'react';
import { TouchableOpacity } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Icon,
  IconName,
  Text,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import { Skeleton } from '../../../../component-library/components-temp/Skeleton';
import { useTheme } from '../../../../util/theme';
import { useStyles } from '../../../../component-library/hooks';
import styleSheet from './NotificationsSettings.styles';

// Mirrors NotificationRow's exact JSX tree (same Box/Text/Icon components,
// same styles.switchElement, no invented gaps) — only the icon/text nodes are
// wrapped in Skeleton's hideChildren mode, so the shimmer is sized from the
// real components' own metrics instead of hand-picked pixel values that can
// drift out of sync with the loaded row.
const ROW_COUNT = 4;

const NotificationsSettingsRowSkeleton = () => {
  const theme = useTheme();
  const { styles } = useStyles(styleSheet, { theme });

  return (
    <>
      {Array.from({ length: ROW_COUNT }, (_, index) => (
        <TouchableOpacity
          key={index}
          style={styles.switchElement}
          disabled
          testID="notifications-settings-row-skeleton"
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
          >
            <Skeleton hideChildren twClassName="rounded-md">
              <Icon name={IconName.Clock} />
            </Skeleton>
            <Box twClassName="ml-4">
              <Skeleton hideChildren twClassName="rounded-md">
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Medium}
                >
                  Wallet activity
                </Text>
              </Skeleton>
              <Skeleton width={100} height={12} twClassName="rounded-md mt-2" />
            </Box>
          </Box>
          <Skeleton hideChildren twClassName="rounded-md">
            <Icon name={IconName.ArrowRight} />
          </Skeleton>
        </TouchableOpacity>
      ))}
    </>
  );
};

export default NotificationsSettingsRowSkeleton;
