import { ExitRequestWithClaimedAssetInfo } from '../StakingBalance.types';

export const filterExitRequests = (
  exitRequests: ExitRequestWithClaimedAssetInfo[],
) =>
  exitRequests.reduce<{
    unstakingRequests: ExitRequestWithClaimedAssetInfo[];
    claimableRequests: ExitRequestWithClaimedAssetInfo[];
  }>(
    (acc, request) => {
      const isClaimableRequest =
        request?.withdrawalTimestamp &&
        Number(request.withdrawalTimestamp) === 0;

      if (isClaimableRequest) {
        acc.claimableRequests.push(request);
        return acc;
      }

      acc.unstakingRequests.push(request);
      return acc;
    },
    { unstakingRequests: [], claimableRequests: [] },
  );
