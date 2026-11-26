import React from 'react';
import { Image, Pressable } from 'react-native';
import {
  Box,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../../locales/i18n';
import securityIllustration from '../../../../../../images/secure_wallet_dark.png';
import { PredictHomeTestIds } from '../PredictHome.testIds';

interface GetStartedBannerProps {
  /** Starts Account Setup. */
  onPress: () => void;
  /** Intrinsically unavailable while a setup flow is already opening. */
  isDisabled?: boolean;
}

/**
 * Home's invitation to start Account Setup, for a user who is not ready to
 * trade. The whole card is one press target; it has no close action.
 */
export const GetStartedBanner = ({
  onPress,
  isDisabled = false,
}: GetStartedBannerProps) => {
  const tw = useTailwind();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) =>
        tw.style(
          'flex-row items-start gap-4 rounded-xl bg-section px-4 py-3',
          pressed && 'opacity-80',
          isDisabled && 'opacity-50',
        )
      }
      testID={PredictHomeTestIds.GET_STARTED_BANNER}
    >
      <Box twClassName="h-18 w-18 items-center justify-center overflow-hidden rounded-lg bg-muted p-2">
        <Image
          accessible={false}
          importantForAccessibility="no"
          resizeMode="contain"
          source={securityIllustration}
          style={tw.style('h-14 w-14')}
          testID={PredictHomeTestIds.GET_STARTED_BANNER_IMAGE}
        />
      </Box>
      <Box twClassName="flex-1 gap-0.5">
        <Text
          accessibilityRole="header"
          fontWeight={FontWeight.Medium}
          variant={TextVariant.BodyMd}
        >
          {strings('predict_next.get_started_banner.title')}
        </Text>
        <Text color={TextColor.TextAlternative} variant={TextVariant.BodySm}>
          {strings('predict_next.get_started_banner.body')}
        </Text>
      </Box>
    </Pressable>
  );
};
