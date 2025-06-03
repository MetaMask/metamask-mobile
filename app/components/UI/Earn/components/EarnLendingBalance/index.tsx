import React, { useMemo } from 'react';
import { View, StyleSheet, TextStyle } from 'react-native';
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
import {
  selectStablecoinLendingEnabledFlag,
  selectStablecoinLendingServiceInterruptionBannerEnabledFlag,
} from '../../selectors/featureFlags';
import AssetElement from '../../../AssetElement';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../component-library/components/Badges/BadgeWrapper';
import Badge, {
  BadgeVariant,
} from '../../../../../component-library/components/Badges/Badge';
import { NetworkBadgeSource } from '../../../AssetOverview/Balance/Balance';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { selectNetworkConfigurationByChainId } from '../../../../../selectors/networkController';
import { RootState } from '../../../../../reducers';
import { Hex } from '@metamask/utils';
import AvatarToken from '../../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import { AvatarSize } from '../../../../../component-library/components/Avatars/Avatar';
import useEarnTokens from '../../hooks/useEarnTokens';
import PercentageChange from '../../../../../component-library/components-temp/Price/PercentageChange';
import { useTokenPricePercentageChange } from '../../../Tokens/hooks/useTokenPricePercentageChange';
import EarnEmptyStateCta from '../EmptyStateCta';
import BigNumber from 'bignumber.js';
import { Theme } from '../../../../../util/theme/models';
import EarnMaintenanceBanner from '../EarnMaintenanceBanner';

const lendingEarningsStylesheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    stakingEarningsContainer: {
      paddingHorizontal: 16,
      paddingTop: 24,
    },
    title: {
      paddingBottom: 8,
    } as TextStyle,
    keyValueRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 8,
    },
    keyValuePrimaryTextWrapper: {
      flexDirection: 'row',
    },
    keyValuePrimaryTextWrapperCentered: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    keyValuePrimaryText: {
      color: colors.text.alternative,
    },
    keyValueSecondaryText: {
      alignItems: 'flex-end',
    },
  });
};

interface LendingEarningsProps {
  asset: TokenI;
}

const LendingEarnings = ({ asset }: LendingEarningsProps) => {
  const { styles } = useStyles(lendingEarningsStylesheet, {});

  const isStablecoinLendingServiceInterruptionBannerEnabled = useSelector(
    selectStablecoinLendingServiceInterruptionBannerEnabledFlag,
  );

  const { getPairedEarnTokens } = useEarnTokens();

  const { earnToken, outputToken } = getPairedEarnTokens(asset);

  return (
    <View style={styles.stakingEarningsContainer}>
      <Text variant={TextVariant.HeadingMD} style={styles.title}>
        {strings('stake.your_earnings')}
      </Text>
      <View>
        {isStablecoinLendingServiceInterruptionBannerEnabled && (
          <EarnMaintenanceBanner />
        )}
        {/* Annual Rate */}
        <View style={styles.keyValueRow}>
          <View style={styles.keyValuePrimaryTextWrapper}>
            <Text
              variant={TextVariant.BodyMDMedium}
              style={styles.keyValuePrimaryText}
            >
              {strings('stake.annual_rate')}
            </Text>
          </View>
          <Text variant={TextVariant.BodyMD} color={TextColor.Success}>
            {`${earnToken?.experience?.apr}% ${strings('earn.apr')}`}
          </Text>
        </View>
        <View style={styles.keyValueRow}>
          <View style={styles.keyValuePrimaryTextWrapperCentered}>
            <Text
              variant={TextVariant.BodyMDMedium}
              style={styles.keyValuePrimaryText}
            >
              {strings('stake.lifetime_rewards')}
            </Text>
          </View>
          <View style={styles.keyValueSecondaryText}>
            <Text variant={TextVariant.BodyMD}>
              {outputToken?.experience?.estimatedAnnualRewardsFormatted}
            </Text>
            <Text
              variant={TextVariant.BodySMMedium}
              color={TextColor.Alternative}
            >
              {outputToken?.experience?.estimatedAnnualRewardsTokenFormatted}
            </Text>
          </View>
        </View>
        <View style={styles.keyValueRow}>
          <View style={styles.keyValuePrimaryTextWrapperCentered}>
            <Text
              variant={TextVariant.BodyMDMedium}
              color={TextColor.Alternative}
            >
              {strings('stake.estimated_annual_earnings')}
            </Text>
          </View>
          <View style={styles.keyValueSecondaryText}>
            <Text variant={TextVariant.BodyMD}>
              {outputToken?.experience?.estimatedAnnualRewardsFormatted}
            </Text>
            <Text
              variant={TextVariant.BodySMMedium}
              color={TextColor.Alternative}
            >
              {outputToken?.experience?.estimatedAnnualRewardsTokenFormatted}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

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

  const userHasUnderlyingTokensAvailableToLend = useMemo(
    () => new BigNumber(earnToken?.balanceMinimalUnit ?? '0').gt(0),
    [earnToken?.balanceMinimalUnit],
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
      {userHasLendingPositions && (
        <View style={styles.container}>
          <Button
            variant={ButtonVariants.Secondary}
            style={styles.button}
            size={ButtonSize.Lg}
            label={strings('earn.withdraw')}
            onPress={handleNavigateToWithdrawalInputScreen}
            testID={EARN_LENDING_BALANCE_TEST_IDS.WITHDRAW_BUTTON}
          />
          {userHasUnderlyingTokensAvailableToLend && !isAssetReceiptToken && (
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
      )}
      <LendingEarnings asset={asset} />
    </View>
  );
};
export default EarnLendingBalance;
