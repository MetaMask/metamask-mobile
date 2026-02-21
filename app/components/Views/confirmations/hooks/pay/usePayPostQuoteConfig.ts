import { useSelector } from 'react-redux';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { getPostQuoteOverrideKey } from '../../utils/transaction';
import {
  PayPostQuoteConfig,
  selectPayPostQuoteFlags,
  resolvePayPostQuoteConfig,
} from '../../../../../selectors/featureFlagController/confirmations';

/**
 * Resolves the effective post-quote config for the current transaction,
 * applying any transaction-type-specific override.
 */
export function usePayPostQuoteConfig(): PayPostQuoteConfig {
  const transactionMeta = useTransactionMetadataRequest();
  const postQuoteFlags = useSelector(selectPayPostQuoteFlags);
  const overrideKey = getPostQuoteOverrideKey(transactionMeta);
  return resolvePayPostQuoteConfig(postQuoteFlags, overrideKey);
}
