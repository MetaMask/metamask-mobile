import { useEffect, useState } from 'react';
import { useCardSDK } from '../sdk';
import { SupportedToken } from '../../../../selectors/featureFlagController/card';

/**
 * Hook to retrieve card supported tokens
 */
export const useGetSupportedTokens = () => {
  const { sdk } = useCardSDK();
  const [supportedTokens, setSupportedTokens] = useState<SupportedToken[]>([]);

  useEffect(() => {
    if (sdk) {
      const tokens = sdk.supportedTokens;

      setSupportedTokens(tokens);
    }
  }, [sdk]);

  return { supportedTokens };
};
