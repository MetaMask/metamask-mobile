import { DepositNavigationParams } from '../../types';

export default function parseDepositParams(
  depositParams: Record<string, string | undefined>,
): DepositNavigationParams | undefined {
  // create a rampIntent object if the pathParams contain the necessary fields
  const params: DepositNavigationParams = {
    assetId: depositParams.assetId,
    amount: depositParams.amount,
  };

  if (!params.assetId && !params.amount) {
    return undefined;
  }

  Object.keys(params).forEach(
    (key) =>
      params[key as keyof DepositNavigationParams] === undefined &&
      delete params[key as keyof DepositNavigationParams],
  );

  return params;
}
