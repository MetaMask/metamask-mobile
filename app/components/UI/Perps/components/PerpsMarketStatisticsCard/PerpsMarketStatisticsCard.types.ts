import type { usePerpsMarketStats } from '../../hooks/usePerpsMarketStats';
import type { PerpsTooltipContentKey } from '../PerpsBottomSheetTooltip';

export interface PerpsMarketStatisticsCardProps {
  marketStats: ReturnType<typeof usePerpsMarketStats>;
  onTooltipPress: (contentKey: PerpsTooltipContentKey) => void;
}
