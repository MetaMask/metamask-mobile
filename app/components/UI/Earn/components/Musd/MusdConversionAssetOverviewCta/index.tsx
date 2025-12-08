import React from 'react';
import { View, Image } from 'react-native';
import stylesheet from './MusdConversionAssetOverviewCta.styles';
import { useStyles } from '../../../../../hooks/useStyles';
import Text from '../../../../../../component-library/components/Texts/Text';
import musdIcon from '../../../../../../images/musd-icon-no-background-2x.png';
import { useMusdConversion } from '../../../hooks/useMusdConversion';
import { MUSD_CONVERSION_DEFAULT_CHAIN_ID } from '../../../constants/musd';
import { toHex } from '@metamask/controller-utils';
import { TokenI } from '../../../../Tokens/types';
import Routes from '../../../../../../constants/navigation/Routes';
import { useNavigation } from '@react-navigation/native';
import Logger from '../../../../../../util/Logger';
import { strings } from '../../../../../../../locales/i18n';
import { EARN_TEST_IDS } from '../../../constants/testIds';

interface MusdConversionAssetOverviewCtaProps {
  asset: TokenI;
  testId?: string;
}

const MusdConversionAssetOverviewCta = ({
  asset,
  testId = EARN_TEST_IDS.MUSD.ASSET_OVERVIEW_CONVERSION_CTA,
}: MusdConversionAssetOverviewCtaProps) => {
  const { styles } = useStyles(stylesheet, {});

  const navigation = useNavigation();

  const { initiateConversion, hasSeenConversionEducationScreen } =
    useMusdConversion();

  const handlePress = async () => {
    try {
      if (!asset?.address || !asset?.chainId) {
        throw new Error('Asset address or chain ID is not set');
      }

      const config = {
        outputChainId: MUSD_CONVERSION_DEFAULT_CHAIN_ID,
        preferredPaymentToken: {
          address: toHex(asset.address),
          chainId: toHex(asset.chainId),
        },
        navigationStack: Routes.EARN.ROOT,
      };

      if (!hasSeenConversionEducationScreen) {
        navigation.navigate(config.navigationStack, {
          screen: Routes.EARN.MUSD.CONVERSION_EDUCATION,
          params: {
            preferredPaymentToken: config.preferredPaymentToken,
            outputChainId: config.outputChainId,
          },
        });
        return;
      }

      await initiateConversion(config);
    } catch (error) {
      Logger.error(
        error as Error,
        '[mUSD Conversion] Failed to initiate conversion from asset overview CTA',
      );
    }
  };

  return (
    <View style={styles.container} testID={testId}>
      <Text>
        <Text style={styles.text}>
          {strings('earn.musd_conversion.earn_rewards_when')}
          {`\n`}
          {strings('earn.musd_conversion.you_convert_to')}{' '}
        </Text>
        <Text style={styles.linkText} onPress={handlePress}>
          mUSD
        </Text>
      </Text>
      <Image source={musdIcon} style={styles.musdIcon} />
    </View>
  );
};

export default MusdConversionAssetOverviewCta;
