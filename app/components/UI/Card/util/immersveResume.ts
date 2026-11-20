import Engine from '../../../../core/Engine';

interface ResolveFundingSourceParams {
  fundingChannelId?: string;
  existingId?: string | null;
  /**
   * When set, the controller finds or creates the source for this Money
   * account address. A stored wallet source id is not reused.
   */
  moneyAccountAddress?: string;
}

export async function resolveImmersveFundingSourceId({
  fundingChannelId,
  existingId,
  moneyAccountAddress,
}: ResolveFundingSourceParams): Promise<string> {
  const controller = Engine.context.CardController;
  if (moneyAccountAddress) {
    return controller.resolveMoneyAccountFundingSourceId(moneyAccountAddress);
  }
  if (existingId) {
    return existingId;
  }
  const existing = await controller.getFundingSources();
  const match = fundingChannelId
    ? existing.find((source) => source.fundingChannelId === fundingChannelId)
    : existing[0];
  const resolved = match ?? (await controller.createFundingSource());
  return resolved.id;
}
