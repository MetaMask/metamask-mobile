import React from 'react';
import { Image, Pressable } from 'react-native';
import {
  Box,
  ButtonIcon,
  ButtonIconSize,
  FontWeight,
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../../locales/i18n';
// Stands in for the design's Kalshi Security illustration, which is pending an
// export. Replace it once the asset is in the repo.
import securityIllustration from '../../../../../../images/mfa-shield.png';
import { PredictHomeTestIds } from '../PredictHome.testIds';

interface GetStartedBannerProps {
  /** Starts Account Setup. */
  onPress: () => void;
  /** Hides the banner. */
  onDismiss: () => void;
}

/**
 * Home's invitation to start Account Setup, for a user who is not ready to
 * trade. The whole card is one press target. The close button is laid over
 * it as a sibling rather than nested inside it, because on Android a press on
 * a nested pressable can also press the card.
 */
export const GetStartedBanner = ({
  onPress,
  onDismiss,
}: GetStartedBannerProps) => {
  const tw = useTailwind();

  return (
    <Box>
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) =>
          tw.style(
            'flex-row items-start gap-4 rounded-xl bg-section px-4 py-3',
            pressed && 'opacity-80',
          )
        }
        testID={PredictHomeTestIds.GET_STARTED_BANNER}
      >
        <Box twClassName="h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-lg bg-muted p-2">
          <Image
            resizeMode="contain"
            source={securityIllustration}
            style={tw.style('h-14 w-14')}
            testID={PredictHomeTestIds.GET_STARTED_BANNER_IMAGE}
          />
        </Box>
        <Box twClassName="flex-1 gap-0.5">
          {/* pr-8 keeps the title clear of the close button over its row. */}
          <Text
            fontWeight={FontWeight.Medium}
            twClassName="pr-8"
            variant={TextVariant.BodyMd}
          >
            {strings('predict_next.get_started_banner.title')}
          </Text>
          <Text color={TextColor.TextAlternative} variant={TextVariant.BodySm}>
            {strings('predict_next.get_started_banner.body')}
          </Text>
        </Box>
      </Pressable>
      <ButtonIcon
        accessibilityLabel={strings('navigation.close')}
        iconName={IconName.Close}
        onPress={onDismiss}
        size={ButtonIconSize.Sm}
        testID={PredictHomeTestIds.GET_STARTED_BANNER_DISMISS}
        twClassName="absolute right-4 top-3"
      />
    </Box>
  );
};
