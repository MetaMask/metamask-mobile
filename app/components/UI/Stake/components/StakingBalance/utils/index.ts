import {
  ExitRequestWithClaimedAssetInfo,
  UnstakingRequest,
} from '../StakingBalance.types';
import bn from 'bignumber.js';

// An exitQueueIndex of -1 means that the request has not yet entered the exit queue
// A leftShares value of 0 means that all shares have exited the exit queue and are therefore claimable
// A leftShares value of 1 is due to a rounding error and means the same as a value of 0
export const isExitRequestClaimable = (
  exitRequest: ExitRequestWithClaimedAssetInfo,
) =>
  exitRequest.exitQueueIndex !== '-1' &&
  (exitRequest.leftShares === '0' || exitRequest.leftShares === '1');

export const filterExitRequests = (
  exitRequests: ExitRequestWithClaimedAssetInfo[],
  exchangeRate: string,
) =>
  exitRequests.reduce<{
    unstakingRequests: UnstakingRequest[];
    claimableRequests: ExitRequestWithClaimedAssetInfo[];
  }>(
    (acc, request) => {
      if (isExitRequestClaimable(request)) {
        acc.claimableRequests.push(request);
        return acc;
      }

      // determine current asset value of withdrawing or partially withdrawn request
      const assetsToDisplay = request.claimedAssets
        ? new bn(request.leftShares ?? 0)
            .multipliedBy(exchangeRate)
            .plus(request.claimedAssets)
        : new bn(request.totalShares).multipliedBy(exchangeRate);

      acc.unstakingRequests.push({
        ...request,
        assetsToDisplay: assetsToDisplay.toString(),
      });
      return acc;
    },
    { unstakingRequests: [], claimableRequests: [] },
  );
