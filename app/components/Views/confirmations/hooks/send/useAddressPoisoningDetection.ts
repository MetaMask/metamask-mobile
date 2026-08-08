import { useMemo } from 'react';
import type { SimilarAddressMatch } from '@metamask/phishing-controller';
import Engine from '../../../../../core/Engine';
import Logger from '../../../../../util/Logger';

interface AddressPoisoningDetectionResult {
  isPoisoningSuspect: boolean;
  bestMatch: SimilarAddressMatch | null;
  matches: SimilarAddressMatch[];
}

export function useAddressPoisoningDetection(
  toAddress: string | undefined,
): AddressPoisoningDetectionResult {
  return useMemo(() => {
    if (!toAddress) {
      return { isPoisoningSuspect: false, bestMatch: null, matches: [] };
    }

    try {
      const matches =
        Engine.context.PhishingController.checkAddressPoisoning(toAddress);

      return {
        isPoisoningSuspect: matches.length > 0,
        bestMatch: matches[0] ?? null,
        matches,
      };
    } catch (error) {
      Logger.error(error as Error, 'useAddressPoisoningDetection');
      return { isPoisoningSuspect: false, bestMatch: null, matches: [] };
    }
  }, [toAddress]);
}
