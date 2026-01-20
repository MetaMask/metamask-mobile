import React from 'react';
import { View } from 'react-native';
import styleSheet from './MusdConversionAssetListCta.styles';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../../component-library/components/Texts/Text';
import {
  Button,
  ButtonSize,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import {
  MUSD_CONVERSION_APY,
  MUSD_CONVERSION_DEFAULT_CHAIN_ID,
  MUSD_TOKEN,
  MUSD_TOKEN_ASSET_ID_BY_CHAIN,
} from '../../../constants/musd';
import { toHex } from '@metamask/controller-utils';
import { useRampNavigation } from '../../../../Ramp/hooks/useRampNavigation';
import { RampIntent } from '../../../../Ramp/types';
import { strings } from '../../../../../../../locales/i18n';
import { EARN_TEST_IDS } from '../../../constants/testIds';
import Logger from '../../../../../../util/Logger';
import { useStyles } from '../../../../../hooks/useStyles';
import { useMusdConversionTokens } from '../../../hooks/useMusdConversionTokens';
import { useMusdConversion } from '../../../hooks/useMusdConversion';
import { useMusdCtaVisibility } from '../../../hooks/useMusdCtaVisibility';
import AvatarToken from '../../../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import { AvatarSize } from '../../../../../../component-library/components/Avatars/Avatar';
import { toChecksumAddress } from '../../../../../../util/address';
import Badge, {
  BadgeVariant,
} from '../../../../../../component-library/components/Badges/Badge';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../../component-library/components/Badges/BadgeWrapper';
import { getNetworkImageSource } from '../../../../../../util/networks';
import { MetaMetricsEvents, useMetrics } from '../../../../../hooks/useMetrics';
import { MUSD_EVENTS_CONSTANTS } from '../../../constants/events';
import { useNetworkName } from '../../../../../Views/confirmations/hooks/useNetworkName';

const MusdConversionAssetListCta = () => {
  const { styles } = useStyles(styleSheet, {});

  const { goToBuy } = useRampNavigation();

  const { tokens, getMusdOutputChainId } = useMusdConversionTokens();

  const { initiateConversion, hasSeenConversionEducationScreen } =
    useMusdConversion();

  const { shouldShowBuyGetMusdCta } = useMusdCtaVisibility();

  const { trackEvent, createEventBuilder } = useMetrics();

  const { shouldShowCta, showNetworkIcon, selectedChainId, isEmptyWallet } =
    shouldShowBuyGetMusdCta();

  const networkName = useNetworkName(
    selectedChainId ?? MUSD_CONVERSION_DEFAULT_CHAIN_ID,
  );

  const ctaText = isEmptyWallet
    ? strings('earn.musd_conversion.buy_musd')
    : strings('earn.musd_conversion.get_musd');

  const submitCtaPressedEvent = () => {
    const { MUSD_CTA_TYPES, EVENT_LOCATIONS } = MUSD_EVENTS_CONSTANTS;

    const getRedirectLocation = () => {
      if (!isEmptyWallet) {
        return EVENT_LOCATIONS.BUY_SCREEN;
      }

      return hasSeenConversionEducationScreen
        ? EVENT_LOCATIONS.CUSTOM_AMOUNT_SCREEN
        : EVENT_LOCATIONS.CONVERSION_EDUCATION_SCREEN;
    };

    trackEvent(
      createEventBuilder(MetaMetricsEvents.MUSD_CONVERSION_CTA_CLICKED)
        .addProperties({
          location: EVENT_LOCATIONS.HOME_SCREEN,
          redirects_to: getRedirectLocation(),
          cta_type: MUSD_CTA_TYPES.PRIMARY,
          cta_text: ctaText,
          network_chain_id: selectedChainId || MUSD_CONVERSION_DEFAULT_CHAIN_ID,
          network_name: networkName,
        })
        .build(),
    );
  };

  const handlePress = async () => {
    // Redirect users to buy flow if they have an empty wallet.
    submitCtaPressedEvent();
    // Redirect users to deposit flow if they don't have any stablecoins to convert.
    if (isEmptyWallet) {
      const rampIntent: RampIntent = {
        assetId:
          MUSD_TOKEN_ASSET_ID_BY_CHAIN[
            selectedChainId || MUSD_CONVERSION_DEFAULT_CHAIN_ID
          ],
      };
      goToBuy(rampIntent);
      return;
    }

    // Respect network filter if specific chain selected.
    const preferredTokenOnSelectedChain = selectedChainId
      ? tokens.find((token) => token.chainId === selectedChainId)
      : undefined;

    const paymentToken = preferredTokenOnSelectedChain ?? tokens[0];

    if (!paymentToken.chainId) {
      throw new Error('[mUSD Conversion] payment token chainID missing');
    }

    try {
      await initiateConversion({
        preferredPaymentToken: {
          address: toChecksumAddress(paymentToken.address),
          chainId: toHex(paymentToken.chainId),
        },
        outputChainId: getMusdOutputChainId(paymentToken.chainId),
      });
    } catch (error) {
      Logger.error(
        error as Error,
        '[mUSD Conversion] Failed to initiate conversion from CTA',
      );
    }
  };

  // Don't render if visibility conditions are not met
  if (!shouldShowCta) {
    return null;
  }

  const renderTokenAvatar = () => (
    <AvatarToken
      name={MUSD_TOKEN.symbol}
      imageSource={MUSD_TOKEN.imageSource}
      size={AvatarSize.Lg}
    />
  );

  return (
    <View
      style={styles.container}
      testID={EARN_TEST_IDS.MUSD.ASSET_LIST_CONVERSION_CTA}
    >
      <View style={styles.assetInfo}>
        {showNetworkIcon && selectedChainId ? (
          <BadgeWrapper
            style={styles.badge}
            badgePosition={BadgePosition.BottomRight}
            badgeElement={
              <Badge
                variant={BadgeVariant.Network}
                imageSource={getNetworkImageSource({
                  chainId: selectedChainId,
                })}
              />
            }
          >
            {renderTokenAvatar()}
          </BadgeWrapper>
        ) : (
          renderTokenAvatar()
        )}
        <View>
          <Text variant={TextVariant.BodyMDMedium} color={TextColor.Default}>
            MetaMask USD
          </Text>
          <Text variant={TextVariant.BodySMMedium} color={TextColor.Primary}>
            {strings('earn.earn_a_percentage_bonus', {
              percentage: MUSD_CONVERSION_APY,
            })}
          </Text>
        </View>
      </View>

      <Button
        variant={ButtonVariant.Secondary}
        onPress={handlePress}
        size={ButtonSize.Sm}
      >
        <Text variant={TextVariant.BodySMMedium} color={TextColor.Default}>
          {ctaText}
        </Text>
      </Button>
    </View>
  );
};

export default MusdConversionAssetListCta;
