import type { CaipAssetType } from '@metamask/snaps-sdk';
import type { CaipChainId } from '@metamask/utils';
import { useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import Logger from '../../../../util/Logger';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import { claimUnstakedTrx } from '../utils/tron-staking-snap';

interface UseTronClaimUnstakedTrxParams {
  chainId: CaipChainId;
}

interface UseTronClaimUnstakedTrxReturn {
  handleClaimUnstakedTrx: () => Promise<void>;
  isSubmitting: boolean;
  errors?: string[];
}

const useTronClaimUnstakedTrx = ({
  chainId,
}: UseTronClaimUnstakedTrxParams): UseTronClaimUnstakedTrxReturn => {
  const selectedTronAccount = useSelector(selectSelectedInternalAccountByScope)(
    chainId,
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[] | undefined>(undefined);

  const handleClaimUnstakedTrx = useCallback(async () => {
    if (!selectedTronAccount?.id || !chainId) return;

    setIsSubmitting(true);
    setErrors(undefined);

    try {
      const assetId = `${chainId}/slip44:195` as CaipAssetType;

      const result = await claimUnstakedTrx(selectedTronAccount, {
        fromAccountId: selectedTronAccount.id,
        assetId,
      });

      if (!result?.valid) {
        setErrors(result?.errors ?? []);
      }
    } catch (error) {
      Logger.error(error as Error, '[Tron Claim] Failed to claim unstaked TRX');
      setErrors([(error as Error).message]);
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedTronAccount, chainId]);

  return {
    handleClaimUnstakedTrx,
    isSubmitting,
    errors,
  };
};

export default useTronClaimUnstakedTrx;
