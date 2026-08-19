import { Hex, add0x } from '@metamask/utils';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import BigNumber from 'bignumber.js';
import React, { useMemo, useCallback } from 'react';
import { View } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import Engine from '../../../../../core/Engine';
import { RootState } from '../../../../../reducers';
import { earnSelectors } from '../../../../../selectors/earnController';
import { selectNetworkConfigurationByChainId } from '../../../../../selectors/networkController';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { useStyles } from '../../../../hooks/useStyles';
import { TokenI } from '../../../Tokens/types';
import { EARN_EXPERIENCES } from '../../constants/experiences';
import { selectStablecoinLendingEnabledFlag } from '../../selectors/featureFlags';
import { setMusdConversionAssetDetailCtaSeen } from '../../../../../actions/user';
import { toHexadecimal } from '../../../../../util/number';
import Earnings from '../Earnings';
import styleSheet from './EarnLendingBalance.styles';
import { trace, TraceName } from '../../../../../util/trace';
import MusdConversionAssetOverviewCta from '../Musd/MusdConversionAssetOverviewCta';
import useStakingEligibility from '../../../Stake/hooks/useStakingEligibility';
import { useMusdCtaVisibility } from '../../hooks/useMusdCtaVisibility';
import {
  Button,
  ButtonVariant,
  Text as DesignSystemText,
} from '@metamask/design-system-react-native';

export const EARN_LENDING_BALANCE_TEST_IDS = {
  WITHDRAW_BUTTON: 'withdraw-button',
};

export interface EarnLendingBalanceProps {
  asset: TokenI;
}

const { selectEarnTokenPair, selectEarnOutputToken } = earnSelectors;

const EarnLendingBalance = ({ asset }: EarnLendingBalanceProps) => {
  const { shouldShowAssetOverviewCta } = useMusdCtaVisibility();
  const dispatch = useDispatch();

  const { trackEvent, createEventBuilder } = useAnalytics();

  const network = useSelector((state: RootState) =>
    selectNetworkConfigurationByChainId(state, asset?.chainId as Hex),
  );

  const isStablecoinLendingEnabled = useSelector(
    selectStablecoinLendingEnabledFlag,
  );

  const navigation = useNavigation<AppNavigationProp>();

  const { outputToken: receiptToken, earnToken } = useSelector(
    (state: RootState) => selectEarnTokenPair(state, asset),
  );
  const { isEligible } = useStakingEligibility();
  const isAssetReceiptToken = useSelector((state: RootState) =>
    selectEarnOutputToken(state, asset),
  );

  const userHasLendingPositions = useMemo(
    () => new BigNumber(receiptToken?.balanceMinimalUnit ?? '0').gt(0),
    [receiptToken?.balanceMinimalUnit],
  );

  const { styles } = useStyles(styleSheet, {
    userHasLendingPositions,
  });

  const emitLendingWithdrawalButtonMetaMetric = () => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.EARN_LENDING_WITHDRAW_BUTTON_CLICKED)
        .addProperties({
          action_type: 'withdrawal',
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
    emitLendingWithdrawalButtonMetaMetric();
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

  const handleMusdConversionAssetDetailCtaSeen = useCallback(() => {
    if (!asset?.address || !asset?.chainId) return;
    const ctaKey = `${add0x(toHexadecimal(asset.chainId))}-${asset.address.toLowerCase()}`;
    dispatch(setMusdConversionAssetDetailCtaSeen(ctaKey));
  }, [asset?.address, asset?.chainId, dispatch]);

  const renderMusdConversionCta = () => (
    <View style={styles.musdConversionCta}>
      <MusdConversionAssetOverviewCta
        asset={asset}
        onDismiss={handleMusdConversionAssetDetailCtaSeen}
      />
    </View>
  );

  const shouldShowMusdConversionCta = useMemo(
    () => shouldShowAssetOverviewCta(asset),
    [asset, shouldShowAssetOverviewCta],
  );

  if (!isStablecoinLendingEnabled) {
    if (shouldShowMusdConversionCta) {
      return renderMusdConversionCta();
    }
    return null;
  }

  const renderCta = () => {
    if (!isEligible) {
      return null;
    }
    // Favour the mUSD Conversion CTA over the lending empty state CTA
    if (shouldShowMusdConversionCta) {
      return renderMusdConversionCta();
    }

    return null;
  };

  return (
    <View>
      {renderCta()}
      {isAssetReceiptToken &&
        userHasLendingPositions &&
        Boolean(receiptToken) && (
          <View style={styles.earnings}>
            <Earnings
              asset={asset}
              lendingAction={
                <View style={[styles.container, styles.buttonsContainer]}>
                  <Button
                    variant={ButtonVariant.Secondary}
                    style={styles.button}
                    onPress={handleNavigateToWithdrawalInputScreen}
                    testID={EARN_LENDING_BALANCE_TEST_IDS.WITHDRAW_BUTTON}
                  >
                    <DesignSystemText>
                      {strings('earn.withdraw_from_aave')}
                    </DesignSystemText>
                  </Button>
                </View>
              }
            />
          </View>
        )}
    </View>
  );
};
export default EarnLendingBalance;
