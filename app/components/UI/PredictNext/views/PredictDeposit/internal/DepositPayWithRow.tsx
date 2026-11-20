import React from 'react';
import {
  AvatarToken,
  AvatarTokenSize,
  Box,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import type { PredictDepositNetwork } from '../../../config/depositEnvironment';
import { PredictDepositScreenTestIds } from '../PredictDepositScreen.testIds';

const tokenIconUrl = ({ chainId, usdc }: PredictDepositNetwork): string =>
  `https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/${chainId}/erc20/${usdc.address.toLowerCase()}.png`;

/**
 * The legacy deposit's "Pay with" row, fixed to USDC on the deposit chain:
 * the Kalshi deposit pays with nothing else, so the row does not open a
 * token picker.
 */
export const DepositPayWithRow = ({
  network,
}: {
  network: PredictDepositNetwork;
}) => (
  <Box
    twClassName="min-h-[34px] flex-row items-center justify-between px-2 pb-2.5"
    testID={PredictDepositScreenTestIds.PAY_WITH}
  >
    <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
      {strings('predict_next.deposit.pay_with')}
    </Text>
    <Box twClassName="flex-row items-center gap-2">
      <AvatarToken
        name={network.usdc.symbol}
        src={{ uri: tokenIconUrl(network) }}
        size={AvatarTokenSize.Xs}
      />
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        color={TextColor.TextDefault}
      >
        {strings('predict_next.deposit.token_on_network', {
          token: network.usdc.symbol,
          network: network.networkName,
        })}
      </Text>
    </Box>
  </Box>
);
