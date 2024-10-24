import React from 'react';
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
import Engine from '../../../../../../../core/Engine';

type StakeBannerProps = Pick<BannerProps, 'style'> & {
  claimableAmount: string;
};

const ClaimBanner = ({ claimableAmount, style }: StakeBannerProps) => {
  const { styles } = useStyles(styleSheet, {});

  const activeAccount = useSelector(selectSelectedInternalAccount);

  const { attemptPoolStakedClaimTransaction } = usePoolStakedClaim();

  const { pooledStakesData, refreshPooledStakes } = usePooledStakes();

  const onClaimPress = async () => {
    if (!activeAccount?.address) return;

    const txRes = await attemptPoolStakedClaimTransaction(
      activeAccount?.address,
      pooledStakesData,
    );

    const transactionId = txRes?.transactionMeta.id;

    Engine.controllerMessenger.subscribeOnceIf(
      'TransactionController:transactionConfirmed',
      () => {
        refreshPooledStakes();
      },
      (transactionMeta) => transactionMeta.id === transactionId,
    );
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
          />
        </>
      }
    />
  );
};

export default ClaimBanner;
