import Engine from '../../../../core/Engine';

interface ResolveFundingSourceParams {
  fundingChannelId?: string;
  existingId?: string | null;
}

export async function resolveImmersveFundingSourceId({
  fundingChannelId,
  existingId,
}: ResolveFundingSourceParams): Promise<string> {
  if (existingId) {
    return existingId;
  }
  const controller = Engine.context.CardController;
  const existing = await controller.getFundingSources();
  const match = fundingChannelId
    ? existing.find((source) => source.fundingChannelId === fundingChannelId)
    : existing[0];
  const resolved = match ?? (await controller.createFundingSource());
  return resolved.id;
}
