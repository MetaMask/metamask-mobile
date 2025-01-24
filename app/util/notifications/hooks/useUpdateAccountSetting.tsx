import { useSwitchNotifications } from '../../../util/notifications/hooks/useSwitchNotifications';
import { useListNotifications } from '../../../util/notifications/hooks/useNotifications';
import { useCallback, useState } from 'react';

export function useUpdateAccountSetting(address: string, updateAndfetchAccountSettings: () => Promise<Record<string, boolean> | undefined>) {
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
        // Concurrently refetch account settings and notifications
        await Promise.all([
          updateAndfetchAccountSettings(),
          refetch()
        ]);
      } catch {
        // Do nothing (we don't need to propagate this)
      }
      setLoading(false);
    },
    [address, refetch, updateAndfetchAccountSettings, switchAccountNotifications],
  );

  return { toggleAccount, loading };
}
