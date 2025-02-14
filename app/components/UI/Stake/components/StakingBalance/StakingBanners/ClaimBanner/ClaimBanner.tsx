import React, { useCallback, useEffect, useState } from 'react';
import Banner, {
  BannerAlertSeverity,
  BannerVariant,
} from '../../../../../../../component-library/components/Banners/Banner';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../../../component-library/components/Texts/Text';
import { strings } from '../../../../../../../../locales/i18n';
import Button, {
  ButtonVariants,
} from '../../../../../../../component-library/components/Buttons/Button';
import { BannerProps } from '../../../../../../../component-library/components/Banners/Banner/Banner.types';
import { useStyles } from '../../../../../../../component-library/hooks';
import styleSheet from './ClaimBanner.styles';
import usePoolStakedClaim from '../../../../hooks/usePoolStakedClaim';
import { useSelector } from 'react-redux';
import { selectSelectedInternalAccount } from '../../../../../../../selectors/accountsController';
import usePooledStakes from '../../../../hooks/usePooledStakes';
import {
  MetaMetricsEvents,
  useMetrics,
} from '../../../../../../hooks/useMetrics';
import { EVENT_LOCATIONS } from '../../../../constants/events';
import Engine from '../../../../../../../core/Engine';
import useStakingChain from '../../../../hooks/useStakingChain';
import { useStakeContext } from '../../../../hooks/useStakeContext';
import { selectChainId } from '../../../../../../../selectors/networkController';
import { hexToNumber } from '@metamask/utils';

type StakeBannerProps = Pick<BannerProps, 'style'> & {
  claimableAmount: string;
};

const ClaimBanner = ({ claimableAmount, style }: StakeBannerProps) => {
  const { styles } = useStyles(styleSheet, {});
  const { trackEvent, createEventBuilder } = useMetrics();
  const [isSubmittingClaimTransaction, setIsSubmittingClaimTransaction] =
    useState(false);
  const { NetworkController } = Engine.context;
  const activeAccount = useSelector(selectSelectedInternalAccount);
  const [shouldAttemptClaim, setShouldAttemptClaim] = useState(false);
  const { attemptPoolStakedClaimTransaction } = usePoolStakedClaim();
  const { stakingContract } = useStakeContext();
  const { pooledStakesData, refreshPooledStakes } = usePooledStakes();
  const chainId = useSelector(selectChainId);
  const { isStakingSupportedChain } = useStakingChain();

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
  ]);

  useEffect(() => {
    if (
      shouldAttemptClaim &&
      isStakingSupportedChain &&
      Number(stakingContract?.chainId) === hexToNumber(chainId)
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
  ]);

  const onClaimPress = async () => {
    setShouldAttemptClaim(true);
    if (!isStakingSupportedChain) {
      await NetworkController.setActiveNetwork('mainnet');
    }
  };

  return (
    <Banner
      severity={BannerAlertSeverity.Success}
      variant={BannerVariant.Alert}
      style={style}
      description={
        <>
          <Text>
            {strings('stake.banner_text.has_claimable_eth', {
              amountEth: claimableAmount,
            })}
          </Text>
          <Button
            testID={'claim-banner-claim-eth-button'}
            variant={ButtonVariants.Link}
            style={styles.claimButton}
            label={
              <Text
                variant={TextVariant.BodyMDMedium}
                color={TextColor.Primary}
              >
                {strings('stake.claim')} ETH
              </Text>
            }
            onPress={onClaimPress}
            disabled={shouldAttemptClaim || isSubmittingClaimTransaction}
            loading={shouldAttemptClaim || isSubmittingClaimTransaction}
          />
        </>
      }
    />
  );
};

export default ClaimBanner;
