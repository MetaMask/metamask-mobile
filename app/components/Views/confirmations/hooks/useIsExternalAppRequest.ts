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
 * ({@link isExternalAppRequestSource}: SDK v1 / MWP / WalletConnect), which
 * is only persisted on signature requests.
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

  // `request_source` is the transport the request arrived on. It is only
  // populated on signature requests; `meta` is not on the persisted
  // MessageParams union type, hence the structural cast.
  const requestSource = (
    signatureRequest?.messageParams as
      | { meta?: { analytics?: { request_source?: string } } }
      | undefined
  )?.meta?.analytics?.request_source;

  return (
    isExternalAppOrigin(origin) || isExternalAppRequestSource(requestSource)
  );
}
