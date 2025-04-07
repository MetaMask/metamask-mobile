import { hexToNumber } from '@metamask/utils';
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
import { selectSelectedInternalAccount } from '../../../../../../../selectors/accountsController';
import { selectConfirmationRedesignFlags } from '../../../../../../../selectors/featureFlagController';
import { selectEvmChainId } from '../../../../../../../selectors/networkController';
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

type StakeBannerProps = Pick<BannerProps, 'style'> & {
  claimableAmount: string;
};

const ClaimBanner = ({ claimableAmount, style }: StakeBannerProps) => {
  const { styles } = useStyles(styleSheet, {});
  const { trackEvent, createEventBuilder } = useMetrics();
  const [isSubmittingClaimTransaction, setIsSubmittingClaimTransaction] =
    useState(false);
  const { MultichainNetworkController } = Engine.context;
  const activeAccount = useSelector(selectSelectedInternalAccount);
  const [shouldAttemptClaim, setShouldAttemptClaim] = useState(false);
  const { attemptPoolStakedClaimTransaction } = usePoolStakedClaim();
  const { stakingContract } = useStakeContext();
  const {
    pooledStakesData,
    refreshPooledStakes
  } = usePooledStakes();

  const chainId = useSelector(selectEvmChainId);
  const { isStakingSupportedChain } = useStakingChain();
  const confirmationRedesignFlags = useSelector(
    selectConfirmationRedesignFlags,
  );
  const isStakingDepositRedesignedEnabled =
    confirmationRedesignFlags?.staking_confirmations;
  const navigation = useNavigation();

  useFocusEffect(
    useCallback(() => {
      setIsSubmittingClaimTransaction(false);
    }, [])
  );

  const attemptClaim = useCallback(async () => {
    try {
      if (!activeAccount?.address) return;

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
          activeAccount?.address,
          pooledStakesData,
        );
        navigation.navigate('StakeScreens', {
          screen: Routes.STANDALONE_CONFIRMATIONS.STAKE_CLAIM,
          params: {
            amountWei: claimableAmount,
          },
        });
        return;
      }

      const txRes = await attemptPoolStakedClaimTransaction(
        activeAccount?.address,
        pooledStakesData,
      );

      const transactionId = txRes?.transactionMeta.id;

      Engine.controllerMessenger.subscribeOnceIf(
        'TransactionController:transactionConfirmed',
        () => {
          refreshPooledStakes();
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
    activeAccount,
    pooledStakesData,
    attemptPoolStakedClaimTransaction,
    createEventBuilder,
    trackEvent,
    refreshPooledStakes,
    claimableAmount,
    isStakingDepositRedesignedEnabled,
    navigation,
  ]);

  useEffect(() => {
    if (
      shouldAttemptClaim &&
      isStakingSupportedChain &&
      Number(stakingContract?.chainId) === hexToNumber(chainId) &&
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
