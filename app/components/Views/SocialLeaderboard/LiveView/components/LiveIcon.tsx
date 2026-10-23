import { Box } from '@metamask/design-system-react-native';
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../../../../util/theme';
import { LiveViewSelectorsIDs } from '../LiveView.testIds';

export const styles = StyleSheet.create({
  controlIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 14,
    marginRight: 0,
    width: 14,
  },
  pauseIcon: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  pauseBar: {
    borderWidth: 1.25,
    borderRadius: 1,
    height: 12,
    width: 4,
  },
  pauseBarRight: {
    marginLeft: 3,
  },
  playIcon: {
    fontSize: 16,
    lineHeight: 16,
    includeFontPadding: false,
    textAlign: 'center',
    textAlignVertical: 'center',
    transform: [{ translateY: 0 }],
  },
});

export interface LiveIconProps {
  isLive: boolean;
  onPrimaryButton?: boolean;
}

const LiveIcon: React.FC<LiveIconProps> = ({
  isLive,
  onPrimaryButton = false,
}) => {
  const { colors } = useTheme();
  const iconColor = isLive
    ? onPrimaryButton
      ? colors.primary.inverse
      : colors.text.default
    : colors.text.muted;
  const playIconStyle = useMemo(
    () => [styles.playIcon, { color: iconColor }],
    [iconColor],
  );

  return (
    <Box
      style={styles.controlIcon}
      testID={LiveViewSelectorsIDs.STREAM_ACTION_ICON}
    >
      {isLive ? (
        <Text style={playIconStyle}>▷</Text>
      ) : (
        <View style={styles.pauseIcon}>
          <View style={[styles.pauseBar, { borderColor: iconColor }]} />
          <View
            style={[
              styles.pauseBar,
              styles.pauseBarRight,
              { borderColor: iconColor },
            ]}
          />
        </View>
      )}
    </Box>
  );
};

export default LiveIcon;
