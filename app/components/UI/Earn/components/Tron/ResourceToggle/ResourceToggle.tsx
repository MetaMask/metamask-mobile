import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Animated, Easing, ViewProps, ViewStyle } from 'react-native';
import {
  ButtonBase,
  ButtonBaseSize,
  FontWeight,
  IconName,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useStyles } from '../../../../../hooks/useStyles';
import styleSheet from './ResourceToggle.styles';

export type ResourceType = 'energy' | 'bandwidth';

export interface ResourceToggleProps extends ViewProps {
  value: ResourceType;
  onChange: (v: ResourceType) => void;
  energyLabel?: string;
  bandwidthLabel?: string;
  testIDEnergy?: string;
  testIDBandwidth?: string;
}

const ResourceToggle = ({
  value,
  onChange,
  energyLabel = 'Energy',
  bandwidthLabel = 'Bandwidth',
  testIDEnergy = 'resource-toggle-energy',
  testIDBandwidth = 'resource-toggle-bandwidth',
  style,
  ...rest
}: ResourceToggleProps) => {
  const { styles } = useStyles(styleSheet, {
    style: style as ViewStyle,
  });
  const isBandwidth = value === 'bandwidth';

  const sliderIndex = useRef(new Animated.Value(isBandwidth ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(sliderIndex, {
      toValue: isBandwidth ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [isBandwidth, sliderIndex]);

  const [width, setWidth] = useState(0);
  const segmentWidth = useMemo(() => Math.max((width - 8) / 2, 0), [width]);
  const translateX = sliderIndex.interpolate({
    inputRange: [0, 1],
    outputRange: [0, segmentWidth],
  });

  return (
    <View style={styles.container} {...rest}>
      <View
        style={styles.group}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      >
        <Animated.View
          style={[
            styles.slider,
            { width: segmentWidth, transform: [{ translateX }] },
          ]}
        />
        <View style={styles.row}>
          <View style={styles.buttonWrapper}>
            <ButtonBase
              onPress={() => onChange('energy')}
              startIconName={IconName.Flash}
              size={ButtonBaseSize.Md}
              isFullWidth
              textProps={{
                variant: TextVariant.BodyMd,
                fontWeight: FontWeight.Medium,
              }}
              style={styles.buttonBase}
              testID={testIDEnergy}
              accessibilityLabel={energyLabel}
            >
              {energyLabel}
            </ButtonBase>
          </View>
          <View style={styles.buttonWrapper}>
            <ButtonBase
              onPress={() => onChange('bandwidth')}
              startIconName={IconName.Connect}
              size={ButtonBaseSize.Md}
              isFullWidth
              textProps={{
                variant: TextVariant.BodyMd,
                fontWeight: FontWeight.Medium,
              }}
              style={styles.buttonBase}
              testID={testIDBandwidth}
              accessibilityLabel={bandwidthLabel}
            >
              {bandwidthLabel}
            </ButtonBase>
          </View>
        </View>
      </View>
    </View>
  );
};

export default ResourceToggle;
