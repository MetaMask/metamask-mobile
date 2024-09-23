import { useSwitchNotifications } from '../../../util/notifications/hooks/useSwitchNotifications';
import { useListNotifications } from '../../../util/notifications/hooks/useNotifications';
import { useCallback, useState } from 'react';

export function useUpdateAccountSetting(address: string, refetchAccountSettings: () => Promise<void>) {
  const { switchAccountNotifications } = useSwitchNotifications();
  const { listNotifications: refetch } = useListNotifications();

  // Local states
  const [loading, setLoading] = useState(false);

  const toggleAccount = useCallback(
    async (state: boolean) => {
      setLoading(true);
      try {
        await switchAccountNotifications([address], state);
        refetchAccountSettings();
        refetch();
      } catch {
        // Do nothing (we don't need to propagate this)
      }
      setLoading(false);
    },
    [address, refetch, refetchAccountSettings, switchAccountNotifications],
  );

  return { toggleAccount, loading };
}
