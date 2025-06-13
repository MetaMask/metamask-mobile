import { Hex } from '@metamask/utils';
import { useNavigation } from '@react-navigation/native';
import BigNumber from 'bignumber.js';
import React, { useMemo } from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../../locales/i18n';
import PercentageChange from '../../../../../component-library/components-temp/Price/PercentageChange';
import { AvatarSize } from '../../../../../component-library/components/Avatars/Avatar';
import AvatarToken from '../../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import Badge, {
  BadgeVariant,
} from '../../../../../component-library/components/Badges/Badge';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../component-library/components/Badges/BadgeWrapper';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import Routes from '../../../../../constants/navigation/Routes';
import { RootState } from '../../../../../reducers';
import { selectNetworkConfigurationByChainId } from '../../../../../selectors/networkController';
import { useStyles } from '../../../../hooks/useStyles';
import AssetElement from '../../../AssetElement';
import { NetworkBadgeSource } from '../../../AssetOverview/Balance/Balance';
import { useTokenPricePercentageChange } from '../../../Tokens/hooks/useTokenPricePercentageChange';
import { TokenI } from '../../../Tokens/types';
import useEarnTokens from '../../hooks/useEarnTokens';
import { selectStablecoinLendingEnabledFlag } from '../../selectors/featureFlags';
import EarnEmptyStateCta from '../EmptyStateCta';
import styleSheet from './EarnLendingBalance.styles';

export const EARN_LENDING_BALANCE_TEST_IDS = {
  RECEIPT_TOKEN_BALANCE_ASSET_LOGO: 'receipt-token-balance-asset-logo',
  RECEIPT_TOKEN_LABEL: 'receipt-token-label',
  WITHDRAW_BUTTON: 'withdraw-button',
  DEPOSIT_BUTTON: 'deposit-button',
};

export interface EarnLendingBalanceProps {
  asset: TokenI;
}

const EarnLendingBalance = ({ asset }: EarnLendingBalanceProps) => {
  const { styles } = useStyles(styleSheet, {});

  const networkConfigurationByChainId = useSelector((state: RootState) =>
    selectNetworkConfigurationByChainId(state, asset.chainId as Hex),
  );

  const isStablecoinLendingEnabled = useSelector(
    selectStablecoinLendingEnabledFlag,
  );

  const navigation = useNavigation();

  const { getPairedEarnTokens, getOutputToken } = useEarnTokens();
  const { outputToken: receiptToken, earnToken } = getPairedEarnTokens(asset);
  const isAssetReceiptToken = getOutputToken(asset);

  const pricePercentChange1d = useTokenPricePercentageChange(receiptToken);

  const userHasLendingPositions = useMemo(
    () => new BigNumber(receiptToken?.balanceMinimalUnit ?? '0').gt(0),
    [receiptToken?.balanceMinimalUnit],
  );

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
        token: earnToken,
      },
    });
  };

  if (!isStablecoinLendingEnabled) return null;

  return (
    // Receipt Token Balance
    <View>
      {receiptToken?.balanceFiat &&
        Boolean(receiptToken?.balanceFormatted) &&
        receiptToken?.chainId &&
        Boolean(receiptToken?.name) &&
        !isAssetReceiptToken &&
        userHasLendingPositions && (
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
            <View style={styles.balances}>
              <Text
                variant={TextVariant.BodyMD}
                testID={EARN_LENDING_BALANCE_TEST_IDS.RECEIPT_TOKEN_LABEL}
              >
                {receiptToken.name}
              </Text>
              <PercentageChange value={pricePercentChange1d ?? 0} />
            </View>
          </AssetElement>
        )}
      {/* Empty State CTA */}
      {!isAssetReceiptToken && !userHasLendingPositions && (
        <View style={styles.EarnEmptyStateCta}>
          <EarnEmptyStateCta token={asset} />
        </View>
      )}
      {/* Buttons */}
      {/* {userHasLendingPositions && ( */}
      <View style={styles.container}>
        {userHasLendingPositions && receiptToken && (
          <Button
            variant={ButtonVariants.Secondary}
            style={styles.button}
            size={ButtonSize.Lg}
            label={strings('earn.withdraw')}
            onPress={handleNavigateToWithdrawalInputScreen}
            testID={EARN_LENDING_BALANCE_TEST_IDS.WITHDRAW_BUTTON}
          />
        )}
        {userHasLendingPositions && earnToken && (
          <Button
            variant={ButtonVariants.Secondary}
            style={styles.button}
            size={ButtonSize.Lg}
            label={strings('earn.deposit_more')}
            onPress={handleNavigateToDepositInputScreen}
            testID={EARN_LENDING_BALANCE_TEST_IDS.DEPOSIT_BUTTON}
          />
        )}
      </View>
    </View>
  );
};
export default EarnLendingBalance;
