import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  ButtonIcon,
  ButtonIconSize,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useStyles } from '../../../../../component-library/hooks';
import { Theme } from '../../../../../util/theme/models';
import { strings } from '../../../../../../locales/i18n';

export const BATCH_SELL_ASSET_PICKER_BANNER_TEST_ID =
  'batch-sell-asset-picker-banner';
export const BATCH_SELL_ASSET_PICKER_BANNER_DISMISS_TEST_ID =
  'batch-sell-asset-picker-banner-dismiss';

interface BatchSellAssetPickerBannerProps {
  onDismiss: () => void;
  onPress: () => void;
}

const createStyles = ({ theme }: { theme: Theme }) =>
  StyleSheet.create({
    container: {
      minHeight: 72,
      marginHorizontal: 16,
      marginBottom: 8,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: theme.colors.background.muted,
      flexDirection: 'row',
      alignItems: 'center',
    },
    imageContainer: {
      width: 46,
      height: 46,
      borderRadius: 8,
      overflow: 'hidden',
      backgroundColor: theme.colors.primary.muted,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 16,
    },
    image: {
      transform: [{ rotate: '180deg' }],
    },
    copyContainer: {
      flex: 1,
      minWidth: 0,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    title: {
      flex: 1,
      minWidth: 0,
    },
    dismissButton: {
      marginLeft: 8,
    },
  });

export function BatchSellAssetPickerBanner({
  onDismiss,
  onPress,
}: BatchSellAssetPickerBannerProps) {
  const { styles } = useStyles(createStyles, {});

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={styles.container}
      testID={BATCH_SELL_ASSET_PICKER_BANNER_TEST_ID}
    >
      <View style={styles.imageContainer}>
        <Icon
          name={IconName.Merge}
          size={IconSize.Xl}
          color={IconColor.PrimaryDefault}
          style={styles.image}
        />
      </View>
      <View style={styles.copyContainer}>
        <View style={styles.titleRow}>
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextDefault}
            fontWeight={FontWeight.Medium}
            numberOfLines={1}
            style={styles.title}
          >
            {strings('asset_overview.batch_sell')}
          </Text>
          <ButtonIcon
            iconName={IconName.Close}
            size={ButtonIconSize.Sm}
            onPress={onDismiss}
            iconProps={{ color: IconColor.IconDefault }}
            style={styles.dismissButton}
            testID={BATCH_SELL_ASSET_PICKER_BANNER_DISMISS_TEST_ID}
          />
        </View>
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          numberOfLines={1}
        >
          {strings('asset_overview.batch_sell_description')}
        </Text>
      </View>
    </Pressable>
  );
}
