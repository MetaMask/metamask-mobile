import { Box } from '@metamask/design-system-react-native';
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../../../../util/theme';
import { LiveViewSelectorsIDs } from '../LiveView.testIds';

const styles = StyleSheet.create({
  pauseIcon: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  pauseBar: {
    borderWidth: 1.25,
    borderRadius: 1,
    height: 15,
    width: 4,
  },
  pauseBarRight: {
    marginLeft: 3,
  },
  playIcon: {
    fontSize: 18,
    lineHeight: 18,
    includeFontPadding: false,
    textAlign: 'center',
    textAlignVertical: 'center',
    transform: [{ translateY: 0 }],
  },
});

export interface LiveStreamControlsProps {
  isLive: boolean;
  onPrimaryButton?: boolean;
}

const LiveStreamControls: React.FC<LiveStreamControlsProps> = ({
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
      testID={LiveViewSelectorsIDs.STREAM_ACTION_ICON}
      twClassName="h-4 w-4 items-center justify-center"
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

export default LiveStreamControls;
