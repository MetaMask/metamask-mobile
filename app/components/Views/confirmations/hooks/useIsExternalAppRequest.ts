import { useSelector } from 'react-redux';

import { selectConfirmationMetricsById } from '../../../../core/redux/slices/confirmationMetrics';
import type { RootState } from '../../../../reducers';
import { useSignatureRequest } from './signatures/useSignatureRequest';
import { useTransactionBatchesMetadata } from './transactions/useTransactionBatchesMetadata';
import { useTransactionMetadataRequest } from './transactions/useTransactionMetadataRequest';
import {
  isExternalAppOrigin,
  isExternalAppRequestSource,
} from '../utils/origin';

/**
 * Whether the current confirmation was requested via a path where the wallet
 * cannot verify the dapp's identity, in which case the UI must display a
 * generic "External app" label rather than the raw (self-reported) origin.
 *
 * Combines the two available signals across every confirmation type
 * (signature, transaction, transaction batch): the origin itself
 * ({@link isExternalAppOrigin}: `'deeplink'` / `'qr-code'` constants, or a
 * bare SDK / MWP connection UUID), and the transport-derived `request_source`
 * ({@link isExternalAppRequestSource}: SDK v1 / MWP / WalletConnect). For
 * signatures the transport rides on `messageParams.meta.analytics`; for
 * transactions it is read from the `confirmationMetrics` slice, which the
 * request entry points populate keyed by transaction id (see
 * `eth_sendTransaction` and `WalletConnect2Session.handleSendTransaction`).
 *
 * This is the single source of truth for the "Request from" rows
 * (`OriginRow`, `NetworkAndOriginRow`, `InfoSectionOriginAndDetails`) so that
 * adding a new unverifiable transport is a one-place change.
 */
export function useIsExternalAppRequest(): boolean {
  const signatureRequest = useSignatureRequest();
  const transactionMetadata = useTransactionMetadataRequest();
  const transactionBatchesMetadata = useTransactionBatchesMetadata();

  const origin =
    transactionMetadata?.origin ??
    signatureRequest?.messageParams?.origin ??
    transactionBatchesMetadata?.origin;

  // `request_source` for signatures: the transport the request arrived on.
  // `meta` is not on the persisted MessageParams union type, hence the
  // structural cast.
  const signatureRequestSource = (
    signatureRequest?.messageParams as
      | { meta?: { analytics?: { request_source?: string } } }
      | undefined
  )?.meta?.analytics?.request_source;

  // `request_source` for transactions: transactions persist only `origin` on
  // TransactionMeta (arbitrary fields cannot be added to controller state),
  // so the transport is stored client-side in the confirmationMetrics slice
  // keyed by transaction id.
  const transactionId =
    transactionMetadata?.id ?? transactionBatchesMetadata?.id;
  const confirmationMetrics = useSelector((state: RootState) =>
    selectConfirmationMetricsById(state, transactionId as string),
  );
  const transactionRequestSource = confirmationMetrics?.properties
    ?.request_source as string | undefined;

  const requestSource = signatureRequestSource ?? transactionRequestSource;

  return (
    isExternalAppOrigin(origin) || isExternalAppRequestSource(requestSource)
  );
}
