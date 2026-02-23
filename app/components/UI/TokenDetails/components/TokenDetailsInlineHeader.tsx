import React from 'react';
import { View, StyleSheet } from 'react-native';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../component-library/components/Texts/Text';
import { Theme } from '@metamask/design-tokens';
import { useStyles } from '../../../hooks/useStyles';
import {
  ButtonIcon,
  ButtonIconSize,
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
      alignItems: 'center',
      height: 48,
      gap: 16,
      marginTop: insets.top,
    },
    leftButton: {
      marginLeft: 16,
    },
    titleWrapper: {
      flex: 1,
      alignItems: 'center',
    },
    rightButton: {
      marginRight: 16,
    },
    rightPlaceholder: {
      marginRight: 16,
      width: 24,
    },
  });
};

export const TokenDetailsInlineHeader = ({
  title,
  networkName,
  onBackPress,
  onOptionsPress,
}: {
  title: string;
  networkName: string;
  onBackPress: () => void;
  onOptionsPress: (() => void) | undefined;
}) => {
  const insets = useSafeAreaInsets();
  const { styles } = useStyles(inlineHeaderStyles, { insets });
  return (
    <View style={styles.container}>
      <ButtonIcon
        style={styles.leftButton}
        onPress={onBackPress}
        size={ButtonIconSize.Lg}
        iconName={IconName.ArrowLeft}
        testID="back-arrow-button"
      />
      <View style={styles.titleWrapper}>
        <Text variant={TextVariant.HeadingSM} numberOfLines={1}>
          {title}
        </Text>
        {networkName ? (
          <Text
            variant={TextVariant.BodySM}
            color={TextColor.Alternative}
            numberOfLines={1}
          >
            {networkName}
          </Text>
        ) : null}
      </View>
      {onOptionsPress ? (
        <ButtonIcon
          style={styles.rightButton}
          onPress={onOptionsPress}
          size={ButtonIconSize.Lg}
          iconName={IconName.MoreVertical}
        />
      ) : (
        <View style={styles.rightPlaceholder} />
      )}
    </View>
  );
};
