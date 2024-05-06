import React, { useCallback, useState } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import Tooltip from 'react-native-walkthrough-tooltip';

import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../component-library/components/Icons/Icon';
import Text, {
  TextColor,
  TextVariant,
} from '../../../component-library/components/Texts/Text';

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

const styles = StyleSheet.create({
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
    backgroundColor: '#FFF', //theme.colors.background.alternative
    shadowColor: 'rgba(0,0,0, .2)',
    shadowOffset: { height: 0, width: 0 },
    shadowOpacity: 1,
    shadowRadius: 2,
  },
  label: {
    height: 14,
    width: 56,
    borderRadius: 8,
    alignItems: 'center',
    alignSelf: 'center',
    justifyContent: 'center',
    backgroundColor: '#F6851F',
    position: 'absolute',
  },
  title: {},
});

export function SmartActions({
  actions,
  hasTitles = true,
  titlePosition = POSITION_TYPE.TOP,
  lablePosition = POSITION_TYPE.TOP,
  toolTipPosition = POSITION_TYPE.TOP,
  swipeable = false,
  showToolTips = true,
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
  const [toolTipVisible, setToolTipVisible] = useState(false);

  const renderItem = useCallback(
    ({ item }: { item: Action }) => (
      <Tooltip
        isVisible={toolTipVisible}
        content={
          <Text variant={TextVariant.BodyXS} color={TextColor.Default}>
            {item?.tooltip || ''}
          </Text>
        }
        placement={toolTipPosition}
        onClose={() => setToolTipVisible(!toolTipVisible)}
      >
        <TouchableOpacity
          style={styles.button}
          onPress={item.onPress}
          accessibilityRole="button"
          accessible
          onLongPress={() => setToolTipVisible(!toolTipVisible)}
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
      </Tooltip>
    ),
    [
      toolTipVisible,
      setToolTipVisible,
      showToolTips,
      hasTitles,
      titlePosition,
      lablePosition,
      toolTipPosition,
    ],
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
