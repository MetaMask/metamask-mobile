import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Theme } from '@metamask/design-tokens';
import { useStyles } from '../../../hooks/useStyles';
import {
  ButtonIcon,
  ButtonIconSize,
  IconColor,
  IconName,
} from '@metamask/design-system-react-native';
import { EdgeInsets, useSafeAreaInsets } from 'react-native-safe-area-context';

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
    rightPlaceholder: {
      width: 24,
    },
  });
};

export const TokenDetailsInlineHeader = ({
  onBackPress,
  iconColorClass,
}: {
  onBackPress: () => void;
  // TODO: Revert to IconColor once we get confirmation from design leads on the final color values.
  iconColorClass?: string;
}) => {
  const insets = useSafeAreaInsets();
  const { styles } = useStyles(inlineHeaderStyles, { insets });
  return (
    <View style={styles.container}>
      <View style={styles.backButtonHitArea}>
        {iconColorClass !== undefined && (
          <ButtonIcon
            onPress={onBackPress}
            size={ButtonIconSize.Md}
            iconName={IconName.ArrowLeft}
            iconProps={
              iconColorClass
                ? { color: iconColorClass as IconColor }
                : undefined
            }
            testID="back-arrow-button"
          />
        )}
      </View>
      <View style={styles.rightPlaceholder} />
    </View>
  );
};
