import { getAllowance, getIsApprovedForAll } from '../utils';
import type { V2AllowanceRequirement } from './v2AllowanceRequirements';

export async function inspectMissingRequirements({
  address,
  requirements,
  readAllowance = getAllowance,
  readIsApprovedForAll = getIsApprovedForAll,
}: {
  address: string;
  requirements: V2AllowanceRequirement[];
  readAllowance?: typeof getAllowance;
  readIsApprovedForAll?: typeof getIsApprovedForAll;
}): Promise<V2AllowanceRequirement[]> {
  const results = await Promise.all(
    requirements.map(async (requirement) => {
      if (requirement.type === 'erc20-allowance') {
        const allowance = await readAllowance({
          tokenAddress: requirement.tokenAddress,
          owner: address,
          spender: requirement.spender,
        });

        return allowance > 0n ? undefined : requirement;
      }

      const approved = await readIsApprovedForAll({
        owner: address,
        operator: requirement.operator,
      });

      return approved ? undefined : requirement;
    }),
  );

  return results.filter(
    (requirement): requirement is V2AllowanceRequirement =>
      requirement !== undefined,
  );
}
