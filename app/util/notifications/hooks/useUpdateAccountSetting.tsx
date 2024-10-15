import { useCallback, useState } from 'react';

import { useSwitchNotifications } from '../../../util/notifications/hooks/useSwitchNotifications';
import { useListNotifications } from '../../../util/notifications/hooks/useNotifications';

export function useUpdateAccountSetting(address: string, updateAndfetchAccountSettings: () => Promise<void>) {
  const { switchAccountNotifications } = useSwitchNotifications();
  const { listNotifications: refetch } = useListNotifications();

  // Local states
  const [loading, setLoading] = useState(false);

  const toggleAccount = useCallback(
    async (state: boolean) => {
      setLoading(true);
      try {
        // change the account state in the controller
        await switchAccountNotifications([address], state);
        // refetch the account settings from the controller
        updateAndfetchAccountSettings();
        // refetch the notifications from the controller
        refetch();
      } catch {
        // Do nothing (we don't need to propagate this)
      }
      setLoading(false);
    },
    [address, refetch, updateAndfetchAccountSettings, switchAccountNotifications],
  );

  return { toggleAccount, loading };
}
