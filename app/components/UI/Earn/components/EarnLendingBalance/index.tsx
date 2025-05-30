import React from 'react';
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

  const { receiptToken } = useLendingTokenPair(asset);

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

  if (!isStablecoinLendingEnabled) return null;

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
