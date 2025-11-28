import React, { View } from 'react-native';
import { useStyles } from '../../../../hooks/useStyles';
import styleSheet from './MusdConversionCta.styles';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import {
  Button,
  ButtonSize,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import {
  MUSD_CONVERSION_DEFAULT_CHAIN_ID,
  MUSD_TOKEN,
  MUSD_TOKEN_ASSET_ID_BY_CHAIN,
} from '../../constants/musd';
import AvatarToken from '../../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import { AvatarSize } from '../../../../../component-library/components/Avatars/Avatar';
import { useMemo } from 'react';
import { useMusdConversionTokens } from '../../hooks/useMusdConversionTokens';
import { useMusdConversion } from '../../hooks/useMusdConversion';
import { toHex } from '@metamask/controller-utils';
import { useRampNavigation } from '../../../Ramp/hooks/useRampNavigation';
import { RampIntent } from '../../../Ramp/types';
import { strings } from '../../../../../../locales/i18n';
import { EARN_TEST_IDS } from '../../constants/testIds';

const MusdConversionCta = () => {
  const { styles } = useStyles(styleSheet, {});

  const { goToBuy } = useRampNavigation();

  const { tokens } = useMusdConversionTokens();
  const { initiateConversion } = useMusdConversion();

  const ctaText = useMemo(() => {
    if (tokens.length === 0) {
      return strings('earn.musd_conversion.buy_musd');
    }

    return strings('earn.musd_conversion.get_musd');
  }, [tokens]);

  const handlePress = () => {
    // Redirect users to deposit flow if they don't have any stablecoins to convert.
    if (tokens.length === 0) {
      const rampIntent: RampIntent = {
        assetId: MUSD_TOKEN_ASSET_ID_BY_CHAIN[MUSD_CONVERSION_DEFAULT_CHAIN_ID],
      };
      goToBuy(rampIntent);
      return;
    }

    const { address, chainId = MUSD_CONVERSION_DEFAULT_CHAIN_ID } = tokens[0];

    initiateConversion({
      outputChainId: toHex(chainId),
      preferredPaymentToken: {
        address: toHex(address),
        chainId: toHex(chainId),
      },
    });
  };

  return (
    <View style={styles.container} testID={EARN_TEST_IDS.MUSD.CONVERSION_CTA}>
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

export default MusdConversionCta;
