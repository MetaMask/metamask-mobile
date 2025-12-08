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
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../../../constants/navigation/Routes';
import Logger from '../../../../../../util/Logger';
import { useStyles } from '../../../../../hooks/useStyles';
import { useMusdConversionTokens } from '../../../hooks/useMusdConversionTokens';
import { useMusdConversion } from '../../../hooks/useMusdConversion';
import AvatarToken from '../../../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import { AvatarSize } from '../../../../../../component-library/components/Avatars/Avatar';

const MusdConversionAssetListCta = () => {
  const { styles } = useStyles(styleSheet, {});

  const { goToBuy } = useRampNavigation();

  const { tokens } = useMusdConversionTokens();

  const { initiateConversion, hasSeenConversionEducationScreen } =
    useMusdConversion();

  const navigation = useNavigation();

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
        assetId: MUSD_TOKEN_ASSET_ID_BY_CHAIN[MUSD_CONVERSION_DEFAULT_CHAIN_ID],
      };
      goToBuy(rampIntent);
      return;
    }

    const { address, chainId } = tokens[0];

    if (!hasSeenConversionEducationScreen) {
      navigation.navigate(Routes.EARN.ROOT, {
        screen: Routes.EARN.MUSD.CONVERSION_EDUCATION,
        params: {
          preferredPaymentToken: {
            address: toHex(address),
            chainId: toHex(chainId as string),
          },
          outputChainId: MUSD_CONVERSION_DEFAULT_CHAIN_ID,
        },
      });
      return;
    }

    // TODO: Reminder to circle back to this when enforcing same-chain conversions.
    // If token[0].chainId isn't guaranteed to match MUSD_CONVERSION_DEFAULT_CHAIN_ID,
    try {
      await initiateConversion({
        outputChainId: MUSD_CONVERSION_DEFAULT_CHAIN_ID,
        preferredPaymentToken: {
          address: toHex(address),
          chainId: toHex(chainId as string),
        },
      });
    } catch (error) {
      Logger.error(
        error as Error,
        '[mUSD Conversion] Failed to initiate conversion from CTA',
      );
    }
  };

  return (
    <View
      style={styles.container}
      testID={EARN_TEST_IDS.MUSD.ASSET_LIST_CONVERSION_CTA}
    >
      <View style={styles.assetInfo}>
        <AvatarToken
          name={MUSD_TOKEN.symbol}
          imageSource={MUSD_TOKEN.imageSource}
          size={AvatarSize.Lg}
        />
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
