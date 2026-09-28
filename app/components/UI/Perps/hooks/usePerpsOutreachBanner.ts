import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import I18n from '../../../../../locales/i18n';
import { useSessionProfileId } from '../../../../util/notifications/hooks/useSessionProfileId';
import { getTerminalOutreachUrl } from '../constants/terminalApi';
import { selectPerpsSelectedAccountAddress } from '../selectors/selectedAccountAddress';
import {
  fetchPerpsOutreachBanner,
  type PerpsOutreachBanner,
} from '../services/perpsOutreachApi';

export const PERPS_OUTREACH_STALE_TIME_MS = 5 * 60 * 1000;

export const perpsOutreachQueryKey = (
  profileId: string | undefined,
  address: string | undefined,
  locale: string,
) => ['perps', 'outreach', profileId ?? null, address ?? null, locale] as const;

export function usePerpsOutreachBanner(): UseQueryResult<
  PerpsOutreachBanner | null,
  Error
> {
  const address = useSelector(selectPerpsSelectedAccountAddress);
  const { profileId } = useSessionProfileId();
  const locale = I18n.locale;

  return useQuery({
    queryKey: perpsOutreachQueryKey(profileId, address, locale),
    staleTime: PERPS_OUTREACH_STALE_TIME_MS,
    enabled: Boolean(profileId || address),
    queryFn: ({ signal }) =>
      fetchPerpsOutreachBanner({
        endpoint: getTerminalOutreachUrl(),
        profileId,
        address,
        locale,
        signal,
      }),
  });
}
