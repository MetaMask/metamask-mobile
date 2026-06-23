import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Theme } from '@metamask/design-tokens';
import { useStyles } from '../../../hooks/useStyles';
import {
  ButtonIcon,
  ButtonIconSize,
  IconName,
} from '@metamask/design-system-react-native';
import { EdgeInsets, useSafeAreaInsets } from 'react-native-safe-area-context';
import { TokenOverviewSelectorsIDs } from '../../AssetOverview/TokenOverview.testIds';

const inlineHeaderStyles = (params: {
  theme: Theme;
  vars: { insets: EdgeInsets };
}) => {
  const {
    theme,
    vars: { insets },
  } = params;
  const { colors } = theme;
  return StyleSheet.create({
    container: {
      backgroundColor: colors.background.default,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      alignSelf: 'stretch',
      paddingVertical: 8,
      paddingHorizontal: 4,
      marginTop: insets.top,
    },
    backButtonHitArea: {
      width: 40,
      height: 40,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 10,
      flexShrink: 0,
    },
    endButtons: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 0,
      flexShrink: 0,
    },
    endButtonHitArea: {
      width: 40,
      height: 40,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      flexShrink: 0,
    },
  });
};

export const TokenDetailsInlineHeader = ({
  onBackPress,
  onPriceAlertPress,
  onSharePress,
  iconColor,
  useAmbientColor = false,
}: {
  onBackPress: () => void;
  onPriceAlertPress?: () => void;
  onSharePress?: () => void;
  /** Hex color string for the back button icon (A/B test). */
  iconColor?: string;
  useAmbientColor?: boolean;
}) => {
  const insets = useSafeAreaInsets();
  const { styles } = useStyles(inlineHeaderStyles, { insets });

  // In control (useAmbientColor=false): always show button
  // In treatment (useAmbientColor=true): only show when iconColor is defined
  const shouldShowButton = !useAmbientColor || iconColor !== undefined;

  return (
    <View style={styles.container}>
      <View style={styles.backButtonHitArea}>
        {shouldShowButton && (
          <ButtonIcon
            onPress={onBackPress}
            size={ButtonIconSize.Md}
            iconName={IconName.ArrowLeft}
            iconProps={
              iconColor ? { twClassName: `text-[${iconColor}]` } : undefined
            }
            testID="back-arrow-button"
          />
        )}
      </View>
      <View style={styles.endButtons}>
        {shouldShowButton && onPriceAlertPress ? (
          <View style={styles.endButtonHitArea}>
            <ButtonIcon
              onPress={onPriceAlertPress}
              size={ButtonIconSize.Md}
              iconName={IconName.Notification}
              testID={TokenOverviewSelectorsIDs.PRICE_ALERT_BUTTON}
              accessibilityLabel="Create price alert"
            />
          </View>
        ) : null}
        {shouldShowButton && onSharePress ? (
          <View style={styles.endButtonHitArea}>
            <ButtonIcon
              onPress={onSharePress}
              size={ButtonIconSize.Md}
              iconName={IconName.Share}
              testID="share-button"
              accessibilityLabel="Share token"
            />
          </View>
        ) : null}
      </View>
    </View>
  );
};
