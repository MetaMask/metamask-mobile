import React, { useCallback, useEffect } from 'react';
import { View } from 'react-native';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import { TokenI } from '../../../Tokens/types';
import styleSheet from './EarnLendingBalance.styles';
import { useStyles } from '../../../../hooks/useStyles';
import { strings } from '../../../../../../locales/i18n';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../../constants/navigation/Routes';
import { useSelector } from 'react-redux';
import { selectStablecoinLendingEnabledFlag } from '../../selectors/featureFlags';
import AssetElement from '../../../AssetElement';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../component-library/components/Badges/BadgeWrapper';
import Badge, {
  BadgeVariant,
} from '../../../../../component-library/components/Badges/Badge';
import { NetworkBadgeSource } from '../../../AssetOverview/Balance/Balance';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { selectNetworkConfigurationByChainId } from '../../../../../selectors/networkController';
import { RootState } from '../../../../../reducers';
import { Hex } from '@metamask/utils';
import useLendingTokenPair from '../../hooks/useLendingTokenPair';
import AvatarToken from '../../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import { AvatarSize } from '../../../../../component-library/components/Avatars/Avatar';
import useTooltipModal from '../../../../hooks/useTooltipModal';
import {
  isSupportedLendingReceiptTokenByChainId,
  isSupportedLendingTokenByChainId,
  LENDING_TOKEN_TO_RECEIPT_TOKEN_MAP,
  RECEIPT_TOKEN_TO_LENDING_TOKEN_MAP,
  TOKEN_ADDRESSES,
} from '../../utils';
import { isEmpty } from 'lodash';
import Clipboard from '@react-native-clipboard/clipboard';
import Icon, {
  IconName,
} from '../../../../../component-library/components/Icons/Icon';
import Engine from '../../../../../core/Engine';
import { toHex } from '@metamask/controller-utils';
import { CHAIN_IDS } from '@metamask/transaction-controller';

export const EARN_LENDING_BALANCE_TEST_IDS = {
  RECEIPT_TOKEN_BALANCE_ASSET_LOGO: 'receipt-token-balance-asset-logo',
  RECEIPT_TOKEN_LABEL: 'receipt-token-label',
  WITHDRAW_BUTTON: 'withdraw-button',
  DEPOSIT_BUTTON: 'deposit-button',
};

export interface EarnLendingBalanceProps {
  asset: TokenI;
  displayBalance?: boolean;
  displayButtons?: boolean;
}

const EarnLendingBalance = ({
  asset,
  displayBalance = true,
  displayButtons = true,
}: EarnLendingBalanceProps) => {
  const { styles } = useStyles(styleSheet, {});

  const networkConfigurationByChainId = useSelector((state: RootState) =>
    selectNetworkConfigurationByChainId(state, asset.chainId as Hex),
  );

  const isStablecoinLendingEnabled = useSelector(
    selectStablecoinLendingEnabledFlag,
  );

  const navigation = useNavigation();

  const { openTooltipModal } = useTooltipModal();

  const { lendingToken, receiptToken } = useLendingTokenPair(asset);

  const copyToClipboard = (tokenAddress: string) => {
    Clipboard.setString(tokenAddress);
    // eslint-disable-next-line no-alert
    alert('Token address copied to clipboard');
  };

  const onNavigateToTooltipModal = useCallback(async () => {
    let tokenToAddType = '';
    let tokenToAddAddress = '';

    if (
      isSupportedLendingTokenByChainId(asset.symbol, asset.chainId as string)
    ) {
      tokenToAddType = 'receipt';
      const matchingReceiptSymbol =
        LENDING_TOKEN_TO_RECEIPT_TOKEN_MAP?.[lendingToken?.chainId as string]?.[
          lendingToken?.symbol as string
        ];
      tokenToAddAddress =
        TOKEN_ADDRESSES?.[lendingToken?.chainId as string]?.[
          matchingReceiptSymbol
        ];
    } else if (
      isSupportedLendingReceiptTokenByChainId(
        asset.symbol,
        asset.chainId as string,
      )
    ) {
      tokenToAddType = 'lending';
      const matchingLendingSymbol =
        RECEIPT_TOKEN_TO_LENDING_TOKEN_MAP?.[receiptToken?.chainId as string]?.[
          receiptToken?.symbol as string
        ];
      tokenToAddAddress =
        TOKEN_ADDRESSES?.[receiptToken?.chainId as string]?.[
          matchingLendingSymbol as string
        ];
    } else {
      return;
    }

    // TODO: Sanity test automatically adding token to TokensController
    const { TokensController } = Engine.context;
    // Need receiptToken's: address, symbol, decimals, name, and chainId
    // Need networkClientId

    if (!lendingToken?.decimals || !lendingToken?.chainId) {
      console.log('FAILED TO ADD');
      return;
    }

    const getAaveV3ReceiptTokenAddressByLendingToken = (
      lendingTokenChainId: string,
      lendingTokenSymbol: string,
    ) => {
      const prefix = 'a';
      const suffix = lendingTokenSymbol;

      const chainIdToAaveChaiAcronymnMap: Record<string, string> = {
        [CHAIN_IDS.MAINNET]: 'Eth',
        [CHAIN_IDS.ARBITRUM]: 'Arb',
        [CHAIN_IDS.LINEA_MAINNET]: 'Lin',
      };

      const networkAcronym =
        chainIdToAaveChaiAcronymnMap?.[lendingTokenChainId];

      const receiptTokenName = `${prefix}${networkAcronym}${suffix}`;

      return TOKEN_ADDRESSES?.[lendingTokenChainId]?.[receiptTokenName];
    };

    const addReceiptTokenPayload = {
      address: getAaveV3ReceiptTokenAddressByLendingToken(
        lendingToken?.chainId as string,
        lendingToken?.symbol as string,
      ),
      symbol:
        LENDING_TOKEN_TO_RECEIPT_TOKEN_MAP[lendingToken.chainId as string][
          lendingToken.symbol as string
        ],
      decimals: lendingToken.decimals,
      name: `Aave Ethereum ${lendingToken.symbol}`,
      chainId: lendingToken?.chainId,
    };

    const networkClientId =
      Engine.context.NetworkController.findNetworkClientIdByChainId(
        toHex(lendingToken.chainId),
      );

    console.log('add token payload: ', {
      ...addReceiptTokenPayload,
      networkClientId,
    });

    await TokensController.addToken({
      ...addReceiptTokenPayload,
      networkClientId,
    }).catch((e) => console.log('ERROR ADDING: ', e));

    // openTooltipModal(
    //   'Potential Token Match Found',
    //   <View style={styles.tempAddTokenContent}>
    //     <View>
    //       <Text selectable>
    //         {`Found matching ${tokenToAddType} token with address: `}
    //         <Text
    //           variant={TextVariant.BodyMDBold}
    //           selectable
    //           onPress={() => copyToClipboard(tokenToAddAddress)}
    //         >
    //           {tokenToAddAddress}
    //           <Icon name={IconName.Copy} />
    //         </Text>
    //         <Text>{` (You can highlight and copy this address)`}</Text>
    //       </Text>
    //     </View>
    //     <Text>{`For the lending flow to work properly, you'll need to add this token`}</Text>
    //     <View>
    //       <Text
    //         variant={TextVariant.HeadingMD}
    //       >{`How to add custom token?`}</Text>
    //       <Text>{`1. From the token list (home screen), click the "+" button in the top-right.`}</Text>
    //       <Text>{`2. On the "import tokens" screen, click the "Custom token" tab.`}</Text>
    //       <Text>{`3. Select the network that this token is on.`}</Text>
    //       <Text>{`4. Paste the token address mentioned above.`}</Text>
    //     </View>
    //   </View>,
    // );
  }, [
    asset.chainId,
    asset.symbol,
    lendingToken.chainId,
    lendingToken.decimals,
    lendingToken.symbol,
    receiptToken,
  ]);

  useEffect(() => {
    const assetType = isSupportedLendingTokenByChainId(
      asset.symbol,
      asset.chainId as string,
    )
      ? 'LENDING'
      : 'RECEIPT';

    if (assetType === 'LENDING' && isEmpty(receiptToken)) {
      onNavigateToTooltipModal();
    }

    if (assetType === 'RECEIPT' && isEmpty(lendingToken)) {
      onNavigateToTooltipModal();
    }
  }, [
    asset.chainId,
    asset.symbol,
    lendingToken,
    onNavigateToTooltipModal,
    receiptToken,
  ]);

  const handleNavigateToWithdrawalInputScreen = () => {
    navigation.navigate('StakeScreens', {
      screen: Routes.STAKING.UNSTAKE,
      params: {
        token: receiptToken,
      },
    });
  };

  const handleNavigateToDepositInputScreen = () => {
    navigation.navigate('StakeScreens', {
      screen: Routes.STAKING.STAKE,
      params: {
        token: asset,
      },
    });
  };

  if (!isStablecoinLendingEnabled || !receiptToken?.chainId) return null;

  return (
    <View>
      {displayBalance && (
        <AssetElement
          asset={receiptToken as TokenI}
          balance={receiptToken.balanceFiat}
          secondaryBalance={receiptToken.balanceFormatted}
        >
          <BadgeWrapper
            badgePosition={BadgePosition.BottomRight}
            style={styles.badgeWrapper}
            badgeElement={
              <Badge
                variant={BadgeVariant.Network}
                imageSource={NetworkBadgeSource(receiptToken.chainId as Hex)}
                name={networkConfigurationByChainId?.name}
              />
            }
          >
            <AvatarToken
              name={asset.symbol}
              imageSource={{ uri: asset.image }}
              size={AvatarSize.Md}
              testID={
                EARN_LENDING_BALANCE_TEST_IDS.RECEIPT_TOKEN_BALANCE_ASSET_LOGO
              }
            />
          </BadgeWrapper>
          <Text
            style={styles.balances}
            variant={TextVariant.BodyLGMedium}
            testID={EARN_LENDING_BALANCE_TEST_IDS.RECEIPT_TOKEN_LABEL}
          >
            {receiptToken.name}
          </Text>
        </AssetElement>
      )}
      {displayButtons && (
        <View style={styles.container}>
          <Button
            variant={ButtonVariants.Secondary}
            style={styles.button}
            size={ButtonSize.Lg}
            label={strings('earn.withdraw')}
            onPress={handleNavigateToWithdrawalInputScreen}
            testID={EARN_LENDING_BALANCE_TEST_IDS.WITHDRAW_BUTTON}
          />
          <Button
            variant={ButtonVariants.Secondary}
            style={styles.button}
            size={ButtonSize.Lg}
            label={strings('earn.deposit_more')}
            onPress={handleNavigateToDepositInputScreen}
            testID={EARN_LENDING_BALANCE_TEST_IDS.DEPOSIT_BUTTON}
          />
        </View>
      )}
    </View>
  );
};
export default EarnLendingBalance;
