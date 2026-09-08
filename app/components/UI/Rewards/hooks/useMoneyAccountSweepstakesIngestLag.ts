import { useSelector } from 'react-redux';
import { selectLastLocalMoneyFlowConfirmedAt } from '../../../../core/redux/slices/moneyBalance';

/**
 * How long a locally-confirmed Money Account transaction may sit ahead of the
 * ingest watermark before we stop flagging the figures as catching up. Past
 * this the ingest is stuck rather than lagging, and telling the user to wait
 * would be a lie.
 */
export const INGEST_LAG_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * Whether the user has a confirmed Money Account transaction that the backend's
 * on-chain ingest has not caught up to, leaving the sweepstakes figures
 * describing the pre-transaction state.
 *
 * Both timestamps are wall-clock values from different machines, so clock skew
 * can shift the verdict by its own magnitude either way. That only changes how
 * long a soft "catching up" hint shows, so it is not corrected for.
 *
 * @param confirmedAt - Epoch ms of the last locally-confirmed Money flow.
 * @param dataAsOf - ISO ingest watermark from the stats response. Absent on
 * older backend builds and null where the ingest has never run; either way any
 * local flow counts as un-ingested.
 */
export const isFlowAheadOfIngest = (
  confirmedAt: number | null,
  dataAsOf?: string | null,
): boolean => {
  if (
    confirmedAt === null ||
    Date.now() - confirmedAt > INGEST_LAG_MAX_AGE_MS
  ) {
    return false;
  }
  const ingestedAt = dataAsOf ? new Date(dataAsOf).getTime() : NaN;
  // An unparseable watermark says nothing about freshness, so it is treated
  // like an absent one rather than trusted to clear the flag.
  return Number.isNaN(ingestedAt) || ingestedAt < confirmedAt;
};

/**
 * Tells the sweepstakes surfaces whether their deposit figures are still
 * catching up to a Money Account transaction the user has already had
 * confirmed. The transaction is confirmed on the Money side, so the campaign
 * surface is the first place that can account for figures that have not moved.
 *
 * @param dataAsOf - Ingest watermark from the sweepstakes stats response.
 */
export const useMoneyAccountSweepstakesIngestLag = (
  dataAsOf?: string | null,
): { isIngestLagging: boolean } => {
  const confirmedAt = useSelector(selectLastLocalMoneyFlowConfirmedAt);
  return { isIngestLagging: isFlowAheadOfIngest(confirmedAt, dataAsOf) };
};

export default useMoneyAccountSweepstakesIngestLag;
