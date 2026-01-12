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
import Engine from '../../../../../core/Engine';
import { RootState } from '../../../../../reducers';
import { earnSelectors } from '../../../../../selectors/earnController';
import { selectNetworkConfigurationByChainId } from '../../../../../selectors/networkController';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import { useStyles } from '../../../../hooks/useStyles';
import AssetElement from '../../../AssetElement';
import { NetworkBadgeSource } from '../../../AssetOverview/Balance/Balance';
import { useTokenPricePercentageChange } from '../../../Tokens/hooks/useTokenPricePercentageChange';
import { TokenI } from '../../../Tokens/types';
import { EARN_EXPERIENCES } from '../../constants/experiences';
import {
  selectIsMusdConversionFlowEnabledFlag,
  selectStablecoinLendingEnabledFlag,
} from '../../selectors/featureFlags';
import Earnings from '../Earnings';
import EarnEmptyStateCta from '../EmptyStateCta';
import styleSheet from './EarnLendingBalance.styles';
import { trace, TraceName } from '../../../../../util/trace';
import { useMusdConversionTokens } from '../../hooks/useMusdConversionTokens';
import MusdConversionAssetOverviewCta from '../Musd/MusdConversionAssetOverviewCta';

export const EARN_LENDING_BALANCE_TEST_IDS = {
  RECEIPT_TOKEN_BALANCE_ASSET_LOGO: 'receipt-token-balance-asset-logo',
  RECEIPT_TOKEN_LABEL: 'receipt-token-label',
  WITHDRAW_BUTTON: 'withdraw-button',
  DEPOSIT_BUTTON: 'deposit-button',
};

export interface EarnLendingBalanceProps {
  asset: TokenI;
}

const { selectEarnTokenPair, selectEarnOutputToken } = earnSelectors;
const EarnLendingBalance = ({ asset }: EarnLendingBalanceProps) => {
  const isMusdConversionFlowEnabled = useSelector(
    selectIsMusdConversionFlowEnabledFlag,
  );

  const { isTokenWithCta } = useMusdConversionTokens();

  const { trackEvent, createEventBuilder } = useMetrics();

  const networkConfigurationByChainId = useSelector((state: RootState) =>
    selectNetworkConfigurationByChainId(state, asset.chainId as Hex),
  );

  const network = useSelector((state: RootState) =>
    selectNetworkConfigurationByChainId(state, asset?.chainId as Hex),
  );

  const isStablecoinLendingEnabled = useSelector(
    selectStablecoinLendingEnabledFlag,
  );

  const navigation = useNavigation();

  const { outputToken: receiptToken, earnToken } = useSelector(
    (state: RootState) => selectEarnTokenPair(state, asset),
  );
  const isAssetReceiptToken = useSelector((state: RootState) =>
    selectEarnOutputToken(state, asset),
  );
  const pricePercentChange1d = useTokenPricePercentageChange(receiptToken);

  const userHasLendingPositions = useMemo(
    () => new BigNumber(receiptToken?.balanceMinimalUnit ?? '0').gt(0),
    [receiptToken?.balanceMinimalUnit],
  );

  const userHasUnderlyingTokensAvailableToLend = useMemo(
    () => new BigNumber(earnToken?.balanceMinimalUnit ?? '0').gt(0),
    [earnToken?.balanceMinimalUnit],
  );

  const { styles } = useStyles(styleSheet, {
    userHasLendingPositions,
  });

  const emitLendingActionButtonMetaMetric = (
    action: 'deposit' | 'withdrawal',
  ) => {
    const event =
      action === 'deposit'
        ? MetaMetricsEvents.EARN_LENDING_DEPOSIT_MORE_BUTTON_CLICKED
        : MetaMetricsEvents.EARN_LENDING_WITHDRAW_BUTTON_CLICKED;

    trackEvent(
      createEventBuilder(event)
        .addProperties({
          action_type: action,
          token: earnToken?.symbol,
          network: network?.name,
          user_earn_token_balance: earnToken?.balanceFormatted,
          user_receipt_token_balance: receiptToken?.balanceFormatted,
          experience: EARN_EXPERIENCES.STABLECOIN_LENDING,
        })
        .build(),
    );
  };

  const getNetworkClientId = (token: TokenI): string | undefined => {
    const { NetworkController } = Engine.context;

    const networkClientId = NetworkController.findNetworkClientIdByChainId(
      token.chainId as Hex,
    );

    if (!networkClientId) {
      console.error(
        `EarnLendingBalance redirect failed: could not retrieve networkClientId for chainId: ${token.chainId}`,
      );
      return;
    }

    return networkClientId;
  };

  const handleNavigateToWithdrawalInputScreen = async () => {
    trace({ name: TraceName.EarnWithdrawScreen });
    emitLendingActionButtonMetaMetric('withdrawal');
    const networkClientId = getNetworkClientId(asset);
    if (!networkClientId) return;
    try {
      await Engine.context.NetworkController.setActiveNetwork(networkClientId);
      navigation.navigate('StakeScreens', {
        screen: Routes.STAKING.UNSTAKE,
        params: {
          token: receiptToken,
        },
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleNavigateToDepositInputScreen = async () => {
    trace({ name: TraceName.EarnDepositScreen });
    emitLendingActionButtonMetaMetric('deposit');
    const networkClientId = getNetworkClientId(asset);
    if (!networkClientId) return;
    try {
      await Engine.context.NetworkController.setActiveNetwork(networkClientId);
      navigation.navigate('StakeScreens', {
        screen: Routes.STAKING.STAKE,
        params: {
          token: earnToken,
        },
      });
    } catch (error) {
      console.error(error);
    }
  };

  const renderMusdConversionCta = () => (
    <View style={styles.musdConversionCta}>
      <MusdConversionAssetOverviewCta asset={asset} />
    </View>
  );

  const hasMusdConversionCta =
    isMusdConversionFlowEnabled && isTokenWithCta(asset);

  if (!isStablecoinLendingEnabled) {
    if (hasMusdConversionCta) {
      return renderMusdConversionCta();
    }
    return null;
  }

  const renderCta = () => {
    // Favour the mUSD Conversion CTA over the lending empty state CTA
    if (hasMusdConversionCta) {
      return renderMusdConversionCta();
    }

    const shouldRenderLendingEmptyStateCta =
      !isAssetReceiptToken && !userHasLendingPositions;

    if (shouldRenderLendingEmptyStateCta) {
      return (
        <View style={styles.EarnEmptyStateCta}>
          <EarnEmptyStateCta token={asset} />
        </View>
      );
    }
    return null;
  };

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
                size={AvatarSize.Lg}
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
      {renderCta()}
      {/* Buttons */}
      {userHasLendingPositions && (
        <View style={[styles.container, styles.buttonsContainer]}>
          {Boolean(receiptToken) && (
            <Button
              variant={ButtonVariants.Secondary}
              style={styles.button}
              size={ButtonSize.Lg}
              label={strings('earn.withdraw')}
              onPress={handleNavigateToWithdrawalInputScreen}
              testID={EARN_LENDING_BALANCE_TEST_IDS.WITHDRAW_BUTTON}
            />
          )}
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
      {isAssetReceiptToken && (
        <View style={styles.earnings}>
          <Earnings asset={asset} />
        </View>
      )}
    </View>
  );
};
export default EarnLendingBalance;
