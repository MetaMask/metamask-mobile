import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import selectRequestRejectionInfo from '../../../../selectors/requests';
import { resetAllRejectionToRequest } from '../../../../actions/requests';

const FIVE_MIN = 5 * 60 * 1000;

const useRejectionToRequestFromOriginInfo = () => {
  const dispatch = useDispatch();
  const requests = useSelector(selectRequestRejectionInfo);
  const [blockedOrigins, setBlockedOrigins] = useState<string[]>([
    'www.test.com',
  ]);

  useEffect(() => {
    const currentTimeStamp = new Date().getTime();
    const blkedOrg = Object.keys(requests)?.filter(
      (origin) =>
        requests[origin].filter((t: number) => currentTimeStamp - t < FIVE_MIN)
          .length >= 3,
    );
    setBlockedOrigins(blkedOrg);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requests, setBlockedOrigins]);

  useEffect(
    () => () => {
      dispatch(resetAllRejectionToRequest());
    },
    [dispatch],
  );

  return {
    blockedOrigins,
  };
};

export default useRejectionToRequestFromOriginInfo;
