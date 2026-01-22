import React from 'react';
import { useSelector } from 'react-redux';
import { View, ViewProps } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Button, {
  ButtonVariants,
} from '../../../../../../component-library/components/Buttons/Button';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../../component-library/hooks';
import { useTheme } from '../../../../../../util/theme';
import Routes from '../../../../../../constants/navigation/Routes';
import { TokenI } from '../../../../Tokens/types';
import styleSheet from './TronStakingButtons.styles';
import { strings } from '../../../../../../../locales/i18n';
import { MetaMetricsEvents, useMetrics } from '../../../../../hooks/useMetrics';
import { EVENT_LOCATIONS } from '../../../../../UI/Stake/constants/events';
import { trace, TraceName } from '../../../../../../util/trace';
import { RootState } from '../../../../../../reducers';
import { selectAsset } from '../../../../../../selectors/assets/assets-list';
import useStakingEligibility from '../../../../Stake/hooks/useStakingEligibility';

interface TronStakingButtonsProps extends Pick<ViewProps, 'style'> {
  asset: TokenI;
  showUnstake?: boolean;
  hasStakedPositions?: boolean;
  aprText?: string;
}

const TronStakingButtons = ({
  asset,
  showUnstake = false,
  hasStakedPositions = false,
  aprText,
}: TronStakingButtonsProps) => {
  const theme = useTheme();
  const { styles } = useStyles(styleSheet, { theme });
  const navigation = useNavigation();
  const { trackEvent, createEventBuilder } = useMetrics();
  const { isEligible } = useStakingEligibility();

  const isStakedTrx =
    asset?.isStaked || asset?.symbol === 'sTRX' || asset?.ticker === 'sTRX';

  const unstakedTrxAsset = useSelector((state: RootState) =>
    isStakedTrx && asset?.address && asset?.chainId
      ? selectAsset(state, {
          address: asset.address,
          chainId: asset.chainId,
          isStaked: false,
        })
      : undefined,
  );

  const baseAssetForStake = React.useMemo(
    () =>
      !isStakedTrx ? asset : (unstakedTrxAsset ?? asset.nativeAsset ?? asset),
    [asset, isStakedTrx, unstakedTrxAsset],
  );

  const onStakePress = () => {
    trace({ name: TraceName.EarnDepositScreen });
    navigation.navigate('StakeScreens', {
      screen: Routes.STAKING.STAKE,
      params: { token: baseAssetForStake },
    });
    trackEvent(
      createEventBuilder(MetaMetricsEvents.STAKE_BUTTON_CLICKED)
        .addProperties({
          location: EVENT_LOCATIONS.HOME_SCREEN,
          text: 'Stake',
          token: asset.symbol,
        })
        .build(),
    );
  };

  const onUnstakePress = () => {
    trace({ name: TraceName.EarnWithdrawScreen });
    navigation.navigate('StakeScreens', {
      screen: Routes.STAKING.UNSTAKE,
      params: { token: asset },
    });
  };

  // Block deposits for ineligible users unless they have an active staked position
  if (!isEligible && !hasStakedPositions) {
    return null;
  }

  return (
    <View style={styles.balanceButtonsContainer}>
      {!hasStakedPositions && isEligible && (
        <View style={styles.ctaContent}>
          <Text variant={TextVariant.HeadingMD} style={styles.ctaTitle}>
            {strings('stake.stake_your_trx_cta.title')}
          </Text>
          <Text style={styles.ctaText}>
            {strings('stake.stake_your_trx_cta.description_start')}
            {aprText ? <Text color={TextColor.Success}>{aprText}</Text> : null}
            {strings('stake.stake_your_trx_cta.description_end')}
          </Text>
        </View>
      )}
      <View style={styles.buttonsRow}>
        {showUnstake ? (
          <Button
            testID={'unstake-button'}
            style={styles.balanceActionButton}
            variant={ButtonVariants.Secondary}
            label={strings('stake.unstake')}
            onPress={onUnstakePress}
          />
        ) : null}
        {isEligible && (
          <Button
            testID={'stake-more-button'}
            style={styles.balanceActionButton}
            variant={ButtonVariants.Secondary}
            label={
              hasStakedPositions
                ? strings('stake.stake_more')
                : strings('stake.stake_your_trx_cta.earn_button')
            }
            onPress={onStakePress}
          />
        )}
      </View>
    </View>
  );
};

export default TronStakingButtons;
