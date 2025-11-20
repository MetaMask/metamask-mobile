import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Animated, Easing, ViewProps, ViewStyle } from 'react-native';
import ButtonBase from '../../../../../../component-library/components/Buttons/Button/foundation/ButtonBase';
import {
  ButtonSize,
  ButtonWidthTypes,
} from '../../../../../../component-library/components/Buttons/Button';
import { TextVariant } from '../../../../../../component-library/components/Texts/Text';
import { IconName } from '../../../../../../component-library/components/Icons/Icon';
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
  const { styles, theme } = useStyles(styleSheet, {
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
              label={energyLabel}
              startIconName={IconName.Flash}
              size={ButtonSize.Md}
              width={ButtonWidthTypes.Full}
              labelTextVariant={TextVariant.BodyMDMedium}
              labelColor={theme.colors.text.default}
              style={styles.buttonBase}
              testID={testIDEnergy}
              accessibilityLabel={energyLabel}
            />
          </View>
          <View style={styles.buttonWrapper}>
            <ButtonBase
              onPress={() => onChange('bandwidth')}
              label={bandwidthLabel}
              startIconName={IconName.Connect}
              size={ButtonSize.Md}
              width={ButtonWidthTypes.Full}
              labelTextVariant={TextVariant.BodyMDMedium}
              labelColor={theme.colors.text.default}
              style={styles.buttonBase}
              testID={testIDBandwidth}
              accessibilityLabel={bandwidthLabel}
            />
          </View>
        </View>
      </View>
    </View>
  );
};

export default ResourceToggle;
