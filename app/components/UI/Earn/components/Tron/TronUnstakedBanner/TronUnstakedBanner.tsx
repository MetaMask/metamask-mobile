import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import type { CaipChainId } from '@metamask/utils';
import { strings } from '../../../../../../../locales/i18n';
import Banner, {
  BannerAlertSeverity,
  BannerVariant,
} from '../../../../../../component-library/components/Banners/Banner';
import {
  Text,
  Button,
  ButtonVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';
import useTronClaimUnstakedTrx from '../../../hooks/useTronClaimUnstakedTrx';
import useEarnToasts from '../../../hooks/useEarnToasts';
import { selectTronClaimUnstakedTrxButtonEnabled } from '../../../../../../selectors/featureFlagController/tronClaimUnstakedTrxButtonEnabled';
import { TronUnstakedBannerTestIds } from './TronUnstakedBanner.testIds';

interface TronUnstakedBannerProps {
  amount: string;
  chainId: CaipChainId;
}

const TronUnstakedBanner = ({ amount, chainId }: TronUnstakedBannerProps) => {
  const showClaimButton = useSelector(selectTronClaimUnstakedTrxButtonEnabled);
  const { handleClaimUnstakedTrx, isSubmitting, errors } =
    useTronClaimUnstakedTrx({ chainId });
  const { showToast, EarnToastOptions } = useEarnToasts();

  useEffect(() => {
    if (errors) {
      showToast(EarnToastOptions.tronWithdrawal.failed(errors));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Only re-fire when a new error occurs; showToast/EarnToastOptions refs change on theme switch and would cause repeat toasts.
  }, [errors]);

  return (
    <Banner
      title={strings('stake.tron.unstaked_banner.title', { amount })}
      severity={BannerAlertSeverity.Success}
      variant={BannerVariant.Alert}
      description={
        <>
          <Text
            testID={TronUnstakedBannerTestIds.BANNER_DESCRIPTION}
            twClassName={showClaimButton ? 'pt-1 pb-4' : 'pt-1'}
          >
            {strings('stake.tron.unstaked_banner.description')}
          </Text>
          {showClaimButton ? (
            <Button
              testID={TronUnstakedBannerTestIds.CLAIM_BUTTON}
              variant={ButtonVariant.Primary}
              size={ButtonSize.Md}
              onPress={handleClaimUnstakedTrx}
              isDisabled={isSubmitting}
            >
              {strings('stake.tron.unstaked_banner.button')}
            </Button>
          ) : null}
        </>
      }
    />
  );
};

export default TronUnstakedBanner;
