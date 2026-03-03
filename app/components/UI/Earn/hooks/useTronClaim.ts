import type { CaipAssetType } from '@metamask/snaps-sdk';
import type { CaipChainId } from '@metamask/utils';
import { useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import Logger from '../../../../util/Logger';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import { claimUnstakedTrx } from '../utils/tron-staking-snap';

interface UseTronClaimParams {
  chainId: CaipChainId;
}

interface UseTronClaimReturn {
  handleClaim: () => Promise<void>;
  isSubmitting: boolean;
  errors?: string[];
}

const useTronClaim = ({ chainId }: UseTronClaimParams): UseTronClaimReturn => {
  const selectedTronAccount = useSelector(selectSelectedInternalAccountByScope)(
    chainId,
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[] | undefined>(undefined);

  const handleClaim = useCallback(async () => {
    if (!selectedTronAccount?.id || !chainId) return;

    setIsSubmitting(true);
    setErrors(undefined);

    try {
      const assetId = `${chainId}/slip44:195` as CaipAssetType;

      const result = await claimUnstakedTrx(selectedTronAccount, {
        fromAccountId: selectedTronAccount.id,
        assetId,
      });

      setErrors(result?.errors);
    } catch (error) {
      Logger.error(error as Error, '[Tron Claim] Failed to confirm claim');
      setErrors([(error as Error).message]);
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedTronAccount, chainId]);

  return {
    handleClaim,
    isSubmitting,
    errors,
  };
};

export default useTronClaim;
