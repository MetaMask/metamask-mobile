import React, { useCallback } from 'react';
import { ScrollView } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  FontWeight,
} from '@metamask/design-system-react-native';

import { strings } from '../../../../locales/i18n';
import Routes from '../../../constants/navigation/Routes';
import { Token } from '../confirmations/components/UI/token';
import { useAccountTokens } from '../confirmations/hooks/send/useAccountTokens';
import { AssetType } from '../confirmations/types/token';
import { RequestPaymentTestIds } from './RequestPayment.testIds';

const RequestPaymentAsset = () => {
  const navigation = useNavigation();
  const tokens = useAccountTokens({ includeNoBalance: true });

  const handleTokenPress = useCallback(
    (asset: AssetType) => {
      navigation.navigate(Routes.REQUEST_PAYMENT.AMOUNT, { asset });
    },
    [navigation],
  );

  return (
    <Box twClassName="flex-1" testID={RequestPaymentTestIds.ASSET_SCREEN}>
      <Box twClassName="px-4 pt-2 pb-1">
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          fontWeight={FontWeight.Medium}
        >
          {strings('request_payment.asset_step_title')}
        </Text>
      </Box>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <Box>
          {tokens.map((asset) => (
            <Token
              key={`${asset.chainId}-${asset.address}`}
              asset={asset}
              onPress={handleTokenPress}
            />
          ))}
        </Box>
      </ScrollView>
    </Box>
  );
};

export default RequestPaymentAsset;
