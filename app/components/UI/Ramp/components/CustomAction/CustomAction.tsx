import React from 'react';
import {
  View,
  TouchableOpacity,
  LayoutChangeEvent,
  ActivityIndicator,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  WithTimingConfig,
} from 'react-native-reanimated';
import { PaymentCustomAction } from '@consensys/on-ramp-sdk/dist/API';
import Box from '../Box';
import Title from '../../../../Base/Title';
import StyledButton from '../../../StyledButton';
import { strings } from '../../../../../../locales/i18n';
import RemoteImage from '../../../../Base/RemoteImage';
import TagColored from '../../../../../component-library/components-temp/TagColored';
import styleSheet from './CustomAction.styles';
import { useStyles } from '../../../../../component-library/hooks';
import { RampType } from '../../types';
import ListItem from '../../../../../component-library/components/List/ListItem';

interface Props {
  customAction: PaymentCustomAction;
  previouslyUsedProvider?: boolean;
  onPress?: () => void;
  onPressCTA?: () => void;
  highlighted?: boolean;
  isLoading?: boolean;
  showInfo: () => void;
  rampType: RampType;
}

const animationConfig: WithTimingConfig = {
  duration: 150,
  easing: Easing.elastic(0.3),
};

const CustomAction: React.FC<Props> = ({
  customAction,
  previouslyUsedProvider,
  onPress,
  onPressCTA,
  showInfo,
  isLoading,
  highlighted,
}: Props) => {
  const {
    styles,
    theme: { colors, themeAppearance },
  } = useStyles(styleSheet, {});
  const {
    buy: { provider },
  } = customAction;
  const shouldShowTags = previouslyUsedProvider;

  const expandedHeight = useSharedValue(0);
  const handleOnLayout = (event: LayoutChangeEvent) => {
    const { nativeEvent } = event;
    if (expandedHeight.value === 0) {
      expandedHeight.value = nativeEvent.layout.height;
    }
  };

  const animatedStyle = useAnimatedStyle(() => {
    if (expandedHeight.value > 0) {
      return {
        height: highlighted
          ? withTiming(expandedHeight.value, animationConfig)
          : withTiming(0, animationConfig),
        opacity: highlighted ? withTiming(1, animationConfig) : withTiming(0),
      };
    }
    return {};
  });

  const animatedOpacity = useAnimatedStyle(() => ({
    opacity: expandedHeight.value ? withDelay(10, withTiming(1)) : 0,
  }));

  return (
    <Animated.View style={animatedOpacity}>
      <Box
        onPress={highlighted ? undefined : onPress}
        highlighted={highlighted}
        activeOpacity={0.8}
        accessible={!highlighted}
        accessibilityLabel={provider?.name}
        compact
      >
        <ListItem
          topAccessoryGap={8}
          topAccessory={
            <>
              {shouldShowTags && (
                <View style={styles.tags}>
                  {previouslyUsedProvider ? (
                    <TagColored>
                      {strings('fiat_on_ramp_aggregator.previously_used')}
                    </TagColored>
                  ) : null}
                </View>
              )}
              <TouchableOpacity
                onPress={highlighted ? showInfo : undefined}
                disabled={!highlighted}
                accessibilityLabel={`${provider?.name} logo`}
                accessibilityHint="Shows provider details"
              >
                <View style={styles.title}>
                  {provider?.logos?.[themeAppearance] ? (
                    <RemoteImage
                      style={{
                        width: provider.logos.width,
                        height: provider.logos.height,
                      }}
                      source={{
                        uri: provider?.logos?.[themeAppearance],
                      }}
                    />
                  ) : (
                    <Title>{provider?.name}</Title>
                  )}

                  {provider && (
                    <Feather name="info" size={12} style={styles.infoIcon} />
                  )}
                </View>
              </TouchableOpacity>
            </>
          }
          bottomAccessory={
            <Animated.View
              onLayout={handleOnLayout}
              style={[styles.data, animatedStyle]}
            >
              <View style={styles.buyButton}>
                <StyledButton
                  type={'blue'}
                  onPress={onPressCTA}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator
                      testID="buy-button-loading"
                      size={'small'}
                      color={colors.primary.inverse}
                    />
                  ) : (
                    strings('fiat_on_ramp_aggregator.continue_with', {
                      provider: provider.name,
                    })
                  )}
                </StyledButton>
              </View>
            </Animated.View>
          }
        />
      </Box>
    </Animated.View>
  );
};

export default CustomAction;
