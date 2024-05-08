/* eslint-disable react-native/no-inline-styles */
import React, { useCallback } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';

import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../component-library/components/Icons/Icon';
import Text, {
  TextColor,
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import { useTheme } from '../../../util/theme';

export interface Action {
  title: string;
  label?: string;
  iconName?: IconName;
  onPress?: () => void;
  onLongPress?: () => void;
  tooltip?: string;
  disabled?: boolean;
}

enum POSITION_TYPE {
  TOP = 'top',
  BOTTOM = 'bottom',
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    wrapper: {
      flex: 1,
      alignSelf: 'center',
      bottom: '-79%',
      paddingBottom: 200,
    },
    button: {
      height: 64,
      width: 64,
      borderRadius: 8,
      padding: 4,
      marginHorizontal: 6,
      marginTop: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background.default,
      shadowColor: colors.overlay.default,
      shadowOpacity: 0.1,
      shadowOffset: { height: 4, width: 0 },
    },
    label: {
      height: 14,
      width: 56,
      borderRadius: 8,
      alignItems: 'center',
      alignSelf: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background.hover,
      position: 'absolute',
    },
    title: {},
  });

export function SmartActions({
  actions,
  hasTitles = true,
  titlePosition = POSITION_TYPE.TOP,
  lablePosition = POSITION_TYPE.TOP,
  swipeable = false,
  ...props
}: {
  actions: Action[];
  hasTitles?: boolean;
  titlePosition?: POSITION_TYPE;
  lablePosition?: POSITION_TYPE;
  toolTipPosition?: POSITION_TYPE;
  swipeable?: boolean;
  showToolTips?: boolean;
}) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const renderItem = useCallback(
    ({ item }: { item: Action }) => (
      <TouchableOpacity
        style={styles.button}
        onPress={item.onPress}
        accessibilityRole="button"
        accessible
        disabled={item.disabled}
      >
        {/* {showToolTips && ()} */}
        {item.label && (
          <View
            style={[
              styles.label,
              { top: lablePosition === POSITION_TYPE.BOTTOM ? 45 : -8 },
            ]}
          >
            <Text variant={TextVariant.BodyXS} color={TextColor.Inverse}>
              {item.label}
            </Text>
          </View>
        )}
        {item.iconName && (
          <Icon
            size={IconSize.Sm}
            name={item.iconName}
            color={IconColor.Primary}
            style={{
              position:
                titlePosition === POSITION_TYPE.TOP ? 'relative' : 'absolute',
            }}
          />
        )}
        {hasTitles && (
          <Text
            variant={TextVariant.BodyXS}
            color={TextColor.Default}
            style={{
              bottom: titlePosition === POSITION_TYPE.TOP ? 0 : -32,
            }}
          >
            {item.title}
          </Text>
        )}
      </TouchableOpacity>
    ),
    [styles.button, styles.label, lablePosition, titlePosition, hasTitles],
  );

  return (
    <FlatList
      horizontal
      data={actions}
      keyExtractor={(item) => item.title}
      scrollEnabled={swipeable}
      renderItem={renderItem}
      style={styles.wrapper}
      {...props}
    />
  );
}
