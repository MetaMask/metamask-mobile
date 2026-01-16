import React from 'react';
import { View, LayoutChangeEvent } from 'react-native';
import TouchableOpacity from '../../../../../Base/TouchableOpacity';
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
import Title from '../../../../../Base/Title';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../../component-library/components/Buttons/Button';
import { strings } from '../../../../../../../locales/i18n';
import RemoteImage from '../../../../../Base/RemoteImage';
import TagColored from '../../../../../../component-library/components-temp/TagColored';
import styleSheet from './CustomAction.styles';
import { useStyles } from '../../../../../../component-library/hooks';
import ListItem from '../../../../../../component-library/components/List/ListItem';

interface Props {
  customAction: PaymentCustomAction;
  previouslyUsedProvider?: boolean;
  onPress?: () => void;
  onPressCTA?: () => void;
  highlighted?: boolean;
  isLoading?: boolean;
  showInfo: () => void;
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
    theme: { themeAppearance },
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
    <Animated.View style={animatedOpacity} testID="animated-view-opacity">
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
              testID="animated-view-height"
            >
              <View style={styles.buyButton}>
                <Button
                  size={ButtonSize.Lg}
                  onPress={() => onPressCTA?.()}
                  label={strings('fiat_on_ramp_aggregator.continue_with', {
                    provider: provider.name,
                  })}
                  variant={ButtonVariants.Primary}
                  width={ButtonWidthTypes.Full}
                  isDisabled={isLoading}
                  loading={isLoading}
                />
              </View>
            </Animated.View>
          }
        />
      </Box>
    </Animated.View>
  );
};

export default CustomAction;
