import { renderHook } from '@testing-library/react-native';
import type {
  Position,
  PositionModifyPreviewResult,
} from '@metamask/perps-controller';
import { usePerpsPositionModifyPreview } from '../../../../hooks';
import { usePerpsProPositionModifyPreview } from './usePerpsProPositionModifyPreview';

jest.mock('../../../../hooks', () => ({
  usePerpsPositionModifyPreview: jest.fn(),
}));

jest.mock('../../../../utils/formatUtils', () => ({
  PRICE_RANGES_MINIMAL_VIEW: [],
  PRICE_RANGES_UNIVERSAL: [],
  formatPerpsFiat: (value: number) => `$${value}`,
}));

const mockUsePerpsPositionModifyPreview = jest.mocked(
  usePerpsPositionModifyPreview,
);

const position = {
  symbol: 'BTC',
  size: '1',
  positionValue: '90000',
  marginUsed: '18000',
  liquidationPrice: '72000',
  entryPrice: '90000',
  leverage: { type: 'isolated', value: 5 },
  providerId: 'hyperliquid',
} as Position;

const renderPreview = () =>
  renderHook(() =>
    usePerpsProPositionModifyPreview({
      position,
      direction: 'long',
      size: '0.1',
      price: 90000,
      leverage: 5,
      reduceOnly: false,
      feeAmountUsd: 2,
      providerId: 'hyperliquid',
      hasValidAmount: true,
      enabled: true,
    }),
  );

describe('usePerpsProPositionModifyPreview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePerpsPositionModifyPreview.mockReturnValue({
      preview: { status: 'none' },
      isCalculating: false,
      isAwaitingFirstPreview: false,
      error: null,
    });
  });

  it('maps an open controller preview to before-and-after summary values', () => {
    const preview: PositionModifyPreviewResult = {
      status: 'open',
      kind: 'increase',
      current: {
        margin: { available: true, value: 18000 },
        liquidationPrice: { available: true, value: 72000 },
      },
      resulting: {
        direction: 'long',
        size: 1.1,
        entryPrice: 90000,
        leverage: 5,
        margin: { available: true, value: 19798 },
        liquidationPrice: { available: true, value: 72100 },
      },
    };
    mockUsePerpsPositionModifyPreview.mockReturnValue({
      preview,
      isCalculating: false,
      isAwaitingFirstPreview: false,
      error: null,
    });

    const { result } = renderPreview();

    expect(result.current.summaryDisplay).toMatchObject({
      showBeforeAfter: true,
      currentMarginDisplay: '$18000',
      resultingMarginDisplay: '$19798',
      currentLiquidationDisplay: '$72000',
      resultingLiquidationDisplay: '$72100',
      tpslDirection: 'long',
      tpslLiquidationPrice: '72100',
    });
  });

  it.each([
    { status: 'none' } as const,
    { status: 'unsupported', reason: 'cross_margin' } as const,
  ])('keeps the single-value summary for $status previews', (preview) => {
    mockUsePerpsPositionModifyPreview.mockReturnValue({
      preview,
      isCalculating: false,
      isAwaitingFirstPreview: false,
      error: null,
    });

    const { result } = renderPreview();

    expect(result.current.summaryDisplay.showBeforeAfter).toBe(false);
  });

  it('forwards the first-preview wait so the parent form can block submission', () => {
    mockUsePerpsPositionModifyPreview.mockReturnValue({
      preview: { status: 'none' },
      isCalculating: true,
      isAwaitingFirstPreview: true,
      error: null,
    });

    const { result } = renderPreview();

    expect(result.current.isAwaitingFirstPreview).toBe(true);
    expect(mockUsePerpsPositionModifyPreview).toHaveBeenCalledWith({
      position,
      direction: 'long',
      size: '0.1',
      price: '90000',
      leverage: 5,
      reduceOnly: false,
      feeAmountUsd: 2,
      providerId: 'hyperliquid',
      enabled: true,
    });
  });
});
