import { useSelector } from 'react-redux';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { getGasFeesSponsoredNetworkEnabled } from '../../../../../selectors/featureFlagController/gasFeesSponsored';
import { useIsGaslessSupported } from '../gas/useIsGaslessSupported';

/**
 * Determines if current transaction is gas sponsored based on:
 * - Is Sponsorship enabled throught feature flags for this network.
 * - Is Gasless feature enabled for current transaction and connected wallet (not HW).
 *
 * @returns { isCurrentTransactionGasSponsored } whether or not this transaction will be sponsored.
 */
export const useIsCurrentTransactionGasSponsored = (): {
  isCurrentTransactionGasSponsored: boolean;
} => {
  const transactionMeta = useTransactionMetadataRequest();
  const { isSupported: isGaslessSupported } = useIsGaslessSupported();

  const isGasFeesSponsoredNetworkEnabled = useSelector(
    getGasFeesSponsoredNetworkEnabled,
  );

  const isCurrentTransactionGasSponsored = Boolean(
    transactionMeta?.chainId &&
      isGaslessSupported &&
      isGasFeesSponsoredNetworkEnabled(transactionMeta?.chainId),
  );

  return {
    isCurrentTransactionGasSponsored,
  };
};
