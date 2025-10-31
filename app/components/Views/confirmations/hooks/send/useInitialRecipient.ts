import { useEffect } from 'react';

import { useParams } from '../../../../../util/navigation/navUtils';
import { useSendContext } from '../../context/send-context';

/**
 * Hook to pre-populate recipient address from navigation params
 * Used when navigating to send flow with a pre-filled recipient (e.g., from QR code scan)
 */
export const useInitialRecipient = () => {
  const { recipientAddress } = useParams<{
    recipientAddress?: string;
  }>();
  const { to, updateTo } = useSendContext();

  useEffect(() => {
    // Only update if we have a recipient from params and haven't already set one
    if (recipientAddress && !to) {
      updateTo(recipientAddress);
    }
  }, [recipientAddress, to, updateTo]);
};
