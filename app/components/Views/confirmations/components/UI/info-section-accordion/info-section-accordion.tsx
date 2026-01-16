import React, { useCallback, useState } from 'react';
import {
  LayoutAnimation,
  Platform,
  StyleProp,
  UIManager,
  View,
  ViewStyle,
} from 'react-native';
import TouchableOpacity from '../../../../../Base/TouchableOpacity';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../../component-library/components/Icons/Icon';
import Text, {
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../../component-library/hooks';
import styleSheet from './info-section-accordion.styles';

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

interface InfoRowAccordionProps {
  /**
   * Header component or title string
   */
  header: React.ReactNode | string;
  /**
   * Content to be shown when accordion is expanded
   */
  children: React.ReactNode;
  /**
   * Initial expanded state
   */
  initiallyExpanded?: boolean;
  /**
   * Optional styles for the container
   */
  style?: StyleProp<ViewStyle>;
  /**
   * Optional styles for the header container
   */
  headerStyle?: StyleProp<ViewStyle>;
  /**
   * Optional styles for the content container
   */
  contentStyle?: StyleProp<ViewStyle>;
  /**
   * Optional callback when accordion state changes
   */
  onStateChange?: (isExpanded: boolean) => void;
  /**
   * Test ID for component
   */
  testID?: string;
}

const ANIMATION_DURATION_MS = 300;

const InfoRowAccordion: React.FC<InfoRowAccordionProps> = ({
  header,
  children,
  initiallyExpanded = false,
  style,
  headerStyle,
  contentStyle,
  onStateChange,
  testID,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const [isExpanded, setIsExpanded] = useState(initiallyExpanded);
  const rotationValue = useSharedValue(initiallyExpanded ? 1 : 0);

  const toggleAccordion = useCallback(() => {
    LayoutAnimation.configureNext(
      LayoutAnimation.create(
        ANIMATION_DURATION_MS,
        LayoutAnimation.Types.easeInEaseOut,
        LayoutAnimation.Properties.opacity,
      ),
    );

    const newExpandedState = !isExpanded;
    setIsExpanded(newExpandedState);
    rotationValue.value = withTiming(newExpandedState ? 1 : 0, {
      duration: ANIMATION_DURATION_MS,
    });
    onStateChange?.(newExpandedState);
  }, [isExpanded, onStateChange, rotationValue]);

  const arrowStyle = useAnimatedStyle(() => {
    const rotation = interpolate(rotationValue.value, [0, 1], [0, 180]);
    return {
      transform: [{ rotate: `${rotation}deg` }],
    };
  });

  return (
    <View style={[styles.container, style]} testID={testID}>
      <TouchableOpacity
        style={[styles.header, headerStyle]}
        onPress={toggleAccordion}
        activeOpacity={0.7}
        testID={`${testID}-header`}
      >
        {typeof header === 'string' ? (
          <Animated.Text>
            <Text variant={TextVariant.BodyMDMedium}>{header}</Text>
          </Animated.Text>
        ) : (
          header
        )}
        <Animated.View style={[styles.iconContainer, arrowStyle]}>
          <Icon
            name={IconName.ArrowDown}
            size={IconSize.Sm}
            color={styles.icon.color}
            testID={`${testID}-arrow`}
          />
        </Animated.View>
      </TouchableOpacity>
      {isExpanded && (
        <View style={[styles.content, contentStyle]}>{children}</View>
      )}
    </View>
  );
};

export default InfoRowAccordion;
