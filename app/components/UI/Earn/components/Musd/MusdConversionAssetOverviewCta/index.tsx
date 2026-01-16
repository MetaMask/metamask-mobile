import React from 'react';
import { View, Image } from 'react-native';
import { Pressable } from 'react-native-gesture-handler';
import stylesheet from './MusdConversionAssetOverviewCta.styles';
import { useStyles } from '../../../../../hooks/useStyles';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../../../../component-library/components/Icons/Icon';
import musdIcon from '../../../../../../images/musd-icon-no-background-2x.png';
import { useMusdConversion } from '../../../hooks/useMusdConversion';
import { toHex } from '@metamask/controller-utils';
import { TokenI } from '../../../../Tokens/types';
import Routes from '../../../../../../constants/navigation/Routes';
import Logger from '../../../../../../util/Logger';
import { strings } from '../../../../../../../locales/i18n';
import { EARN_TEST_IDS } from '../../../constants/testIds';
import { useMusdConversionTokens } from '../../../hooks/useMusdConversionTokens';
import { MetaMetricsEvents, useMetrics } from '../../../../../hooks/useMetrics';
import { MUSD_EVENTS_CONSTANTS } from '../../../constants/events';
import { useNetworkName } from '../../../../../Views/confirmations/hooks/useNetworkName';
import { Hex } from '@metamask/utils';
interface MusdConversionAssetOverviewCtaProps {
  asset: TokenI;
  testId?: string;
  onDismiss?: () => void;
}

const MusdConversionAssetOverviewCta = ({
  asset,
  testId = EARN_TEST_IDS.MUSD.ASSET_OVERVIEW_CONVERSION_CTA,
  onDismiss,
}: MusdConversionAssetOverviewCtaProps) => {
  const { styles } = useStyles(stylesheet, {});

  const { trackEvent, createEventBuilder } = useMetrics();

  const networkName = useNetworkName(asset.chainId as Hex);

  const { initiateConversion, hasSeenConversionEducationScreen } =
    useMusdConversion();

  const { getMusdOutputChainId } = useMusdConversionTokens();

  const submitCtaPressedEvent = () => {
    const { EVENT_LOCATIONS, MUSD_CTA_TYPES } = MUSD_EVENTS_CONSTANTS;

    const ctaText = `${strings('earn.musd_conversion.earn_rewards_when')} ${strings('earn.musd_conversion.you_convert_to')} mUSD`;

    const getRedirectLocation = () =>
      hasSeenConversionEducationScreen
        ? EVENT_LOCATIONS.CUSTOM_AMOUNT_SCREEN
        : EVENT_LOCATIONS.CONVERSION_EDUCATION_SCREEN;

    trackEvent(
      createEventBuilder(MetaMetricsEvents.MUSD_CONVERSION_CTA_CLICKED)
        .addProperties({
          location: EVENT_LOCATIONS.ASSET_OVERVIEW,
          redirects_to: getRedirectLocation(),
          cta_type: MUSD_CTA_TYPES.TERTIARY,
          cta_text: ctaText,
          network_chain_id: asset.chainId,
          network_name: networkName,
          asset_symbol: asset.symbol,
        })
        .build(),
    );
  };

  const handlePress = async () => {
    try {
      submitCtaPressedEvent();

      if (!asset?.address || !asset?.chainId) {
        throw new Error('Asset address or chain ID is not set');
      }

      await initiateConversion({
        preferredPaymentToken: {
          address: toHex(asset.address),
          chainId: toHex(asset.chainId),
        },
        outputChainId: getMusdOutputChainId(asset.chainId),
        navigationStack: Routes.EARN.ROOT,
      });
    } catch (error) {
      Logger.error(
        error as Error,
        '[mUSD Conversion] Failed to initiate conversion from asset overview CTA',
      );
    }
  };

  return (
    <Pressable style={styles.container} testID={testId} onPress={handlePress}>
      {/* Image container on the left */}
      <View style={styles.imageContainer}>
        <Image source={musdIcon} style={styles.musdIcon} />
      </View>

      {/* Text content in the center */}
      <View style={styles.textContainer}>
        <Text variant={TextVariant.BodySMMedium} style={styles.title}>
          {strings('earn.musd_conversion.boost_title')}
        </Text>
        <Text variant={TextVariant.BodySMMedium} color={TextColor.Alternative}>
          {strings('earn.musd_conversion.boost_description')}{' '}
          <Text variant={TextVariant.BodySMMedium} color={TextColor.Primary}>
            mUSD
          </Text>
        </Text>
      </View>

      {/* Close button on the right */}
      {onDismiss && (
        <Pressable
          testID={EARN_TEST_IDS.MUSD.ASSET_OVERVIEW_CONVERSION_CTA_CLOSE_BUTTON}
          onPress={onDismiss}
          hitSlop={16}
          style={styles.closeButton}
        >
          <Icon
            name={IconName.Close}
            size={IconSize.Md}
            color={IconColor.Alternative}
          />
        </Pressable>
      )}
    </Pressable>
  );
};

export default MusdConversionAssetOverviewCta;
