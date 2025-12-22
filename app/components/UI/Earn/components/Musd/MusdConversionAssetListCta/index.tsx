import React, { useMemo } from 'react';
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

const MusdConversionAssetListCta = () => {
  const { styles } = useStyles(styleSheet, {});

  const { goToBuy } = useRampNavigation();

  const { tokens, getMusdOutputChainId } = useMusdConversionTokens();

  const { initiateConversion } = useMusdConversion();

  const { shouldShowCta, showNetworkIcon, selectedChainId } =
    useMusdCtaVisibility();

  const canConvert = useMemo(
    () => Boolean(tokens.length > 0 && tokens?.[0]?.chainId !== undefined),
    [tokens],
  );

  const ctaText = useMemo(() => {
    if (!canConvert) {
      return strings('earn.musd_conversion.buy_musd');
    }

    return strings('earn.musd_conversion.get_musd');
  }, [canConvert]);

  const handlePress = async () => {
    // Redirect users to deposit flow if they don't have any stablecoins to convert.
    if (!canConvert) {
      const rampIntent: RampIntent = {
        assetId:
          MUSD_TOKEN_ASSET_ID_BY_CHAIN[
            selectedChainId || MUSD_CONVERSION_DEFAULT_CHAIN_ID
          ],
      };
      goToBuy(rampIntent);
      return;
    }

    const { address, chainId: paymentTokenChainId } = tokens[0];

    if (!paymentTokenChainId) {
      throw new Error('[mUSD Conversion] payment token chainID missing');
    }

    const paymentTokenAddress = toChecksumAddress(address);

    try {
      await initiateConversion({
        preferredPaymentToken: {
          address: paymentTokenAddress,
          chainId: toHex(paymentTokenChainId),
        },
        outputChainId: getMusdOutputChainId(paymentTokenChainId),
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
          <Text variant={TextVariant.BodySMMedium} color={TextColor.Success}>
            {strings('earn.musd_conversion.earn_points_daily')}
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
