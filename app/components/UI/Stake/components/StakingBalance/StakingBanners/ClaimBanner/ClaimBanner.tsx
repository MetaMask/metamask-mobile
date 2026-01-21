import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../../../../locales/i18n';
import Banner, {
  BannerAlertSeverity,
  BannerVariant,
} from '../../../../../../../component-library/components/Banners/Banner';
import { BannerProps } from '../../../../../../../component-library/components/Banners/Banner/Banner.types';
import Button, {
  ButtonVariants,
} from '../../../../../../../component-library/components/Buttons/Button';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../../../component-library/hooks';
import Routes from '../../../../../../../constants/navigation/Routes';
import Engine from '../../../../../../../core/Engine';
import { selectSelectedInternalAccountByScope } from '../../../../../../../selectors/multichainAccounts/accounts';

import {
  MetaMetricsEvents,
  useMetrics,
} from '../../../../../../hooks/useMetrics';
import { EVENT_LOCATIONS } from '../../../../constants/events';
import usePooledStakes from '../../../../hooks/usePooledStakes';
import usePoolStakedClaim from '../../../../hooks/usePoolStakedClaim';
import { useStakeContext } from '../../../../hooks/useStakeContext';
import useStakingChain from '../../../../hooks/useStakingChain';
import styleSheet from './ClaimBanner.styles';
import { renderFromWei } from '../../../../../../../util/number';
import { TokenI } from '../../../../../Tokens/types';
import { getDecimalChainId } from '../../../../../../../util/networks';
import { trace, TraceName } from '../../../../../../../util/trace';
import { EVM_SCOPE } from '../../../../../Earn/constants/networks';

type StakeBannerProps = Pick<BannerProps, 'style'> & {
  claimableAmount: string;
  asset: TokenI;
};

const ClaimBanner = ({ claimableAmount, asset, style }: StakeBannerProps) => {
  const { styles } = useStyles(styleSheet, {});
  const { trackEvent, createEventBuilder } = useMetrics();
  const [isSubmittingClaimTransaction, setIsSubmittingClaimTransaction] =
    useState(false);
  const { MultichainNetworkController } = Engine.context;
  const selectedAccount = useSelector(selectSelectedInternalAccountByScope)(
    EVM_SCOPE,
  );
  const [shouldAttemptClaim, setShouldAttemptClaim] = useState(false);
  const { attemptPoolStakedClaimTransaction } = usePoolStakedClaim();
  const { stakingContract } = useStakeContext();

  const chainId = getDecimalChainId(asset?.chainId);

  const { pooledStakesData } = usePooledStakes(chainId);

  const { isStakingSupportedChain } = useStakingChain();
  const isStakingDepositRedesignedEnabled = true;
  const navigation = useNavigation();

  useFocusEffect(
    useCallback(() => {
      setIsSubmittingClaimTransaction(false);
    }, []),
  );

  const attemptClaim = useCallback(async () => {
    try {
      if (!selectedAccount?.address) return;

      trace({ name: TraceName.EarnClaimConfirmationScreen });
      trackEvent(
        createEventBuilder(MetaMetricsEvents.STAKE_CLAIM_BUTTON_CLICKED)
          .addProperties({
            location: EVENT_LOCATIONS.TOKEN_DETAILS,
          })
          .build(),
      );

      setIsSubmittingClaimTransaction(true);

      if (isStakingDepositRedesignedEnabled) {
        // Here we add the transaction to the transaction controller. The
        // redesigned confirmations architecture relies on the transaction
        // metadata object being defined by the time the confirmation is displayed
        // to the user.
        await attemptPoolStakedClaimTransaction(
          selectedAccount?.address,
          pooledStakesData,
        );
        navigation.navigate('StakeScreens', {
          screen: Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
          params: {
            amountWei: claimableAmount,
          },
        });
        return;
      }

      const txRes = await attemptPoolStakedClaimTransaction(
        selectedAccount?.address,
        pooledStakesData,
      );

      const transactionId = txRes?.transactionMeta.id;

      Engine.controllerMessenger.subscribeOnceIf(
        'TransactionController:transactionConfirmed',
        () => {
          setIsSubmittingClaimTransaction(false);
        },
        (transactionMeta) => transactionMeta.id === transactionId,
      );

      Engine.controllerMessenger.subscribeOnceIf(
        'TransactionController:transactionFailed',
        () => {
          setIsSubmittingClaimTransaction(false);
        },
        ({ transactionMeta }) => transactionMeta.id === transactionId,
      );

      Engine.controllerMessenger.subscribeOnceIf(
        'TransactionController:transactionRejected',
        () => {
          setIsSubmittingClaimTransaction(false);
        },
        ({ transactionMeta }) => transactionMeta.id === transactionId,
      );
    } catch (e) {
      setIsSubmittingClaimTransaction(false);
    }
  }, [
    selectedAccount,
    pooledStakesData,
    attemptPoolStakedClaimTransaction,
    createEventBuilder,
    trackEvent,
    claimableAmount,
    isStakingDepositRedesignedEnabled,
    navigation,
  ]);

  useEffect(() => {
    if (
      shouldAttemptClaim &&
      isStakingSupportedChain &&
      Number(stakingContract?.chainId) === Number(chainId) &&
      !isSubmittingClaimTransaction
    ) {
      setShouldAttemptClaim(false);
      attemptClaim();
    }
  }, [
    shouldAttemptClaim,
    isStakingSupportedChain,
    stakingContract,
    chainId,
    attemptClaim,
    isSubmittingClaimTransaction,
  ]);

  const onClaimPress = async () => {
    setShouldAttemptClaim(true);
    if (!isStakingSupportedChain) {
      await MultichainNetworkController.setActiveNetwork('mainnet');
    }
  };

  const claimableAmountEth = useMemo(
    () => renderFromWei(claimableAmount),
    [claimableAmount],
  );

  const isLoadingOnClaim = shouldAttemptClaim || isSubmittingClaimTransaction;

  return (
    <Banner
      severity={BannerAlertSeverity.Success}
      variant={BannerVariant.Alert}
      style={style}
      description={
        <>
          <Text>
            {strings('stake.banner_text.has_claimable_eth', {
              amountEth: claimableAmountEth,
            })}
          </Text>
          <Button
            testID={'claim-banner-claim-eth-button'}
            variant={ButtonVariants.Link}
            style={styles.claimButton}
            label={
              <Text
                variant={TextVariant.BodyMDMedium}
                color={isLoadingOnClaim ? TextColor.Muted : TextColor.Primary}
              >
                {strings('stake.claim')} ETH
              </Text>
            }
            onPress={onClaimPress}
            disabled={isLoadingOnClaim}
            loading={isLoadingOnClaim}
          />
        </>
      }
    />
  );
};

export default ClaimBanner;
