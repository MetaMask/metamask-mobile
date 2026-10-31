import { useEffect, useState } from 'react';
import type { KycDataShare } from '@metamask/kyc-controller';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';

export interface IdentityDataSharesResult {
  /** The vendors this customer's identity data was shared with, newest first. */
  shares: KycDataShare[];
  /** True until the first fetch settles, so the list can hold its place. */
  isLoading: boolean;
}

/**
 * Reads the relay's record of who this customer's identity data was shared
 * with. The relay keeps this metadata even after it redacts the underlying
 * session, so it stays readable once verification is long finished.
 *
 * A failure is logged and surfaced as an empty list: the screen's other
 * content is still worth showing, and an empty "Shared with" section reads
 * the same as "nobody yet".
 *
 * @returns The shares and whether the first fetch is still in flight.
 */
export const useIdentityDataShares = (): IdentityDataSharesResult => {
  const [shares, setShares] = useState<KycDataShare[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    Engine.context.KycController.getDataShares()
      .then((result) => {
        if (isActive) {
          setShares(result);
        }
      })
      .catch((error) => {
        Logger.error(
          error as Error,
          'IdentityVerification: failed to load identity data shares',
        );
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  return { shares, isLoading };
};
