import Routes from '../../../../constants/navigation/Routes';
import {
  BridgeEntryPoint,
  CancelTargetType,
  Flow,
  resolveFlowStrategy,
} from './flowStrategy';

describe('resolveFlowStrategy', () => {
  it('cancels to the bridge view for the default swap entry point', () => {
    const strategy = resolveFlowStrategy({ routeParams: {} });

    expect(strategy.flow).toBe(Flow.Bridge);
    expect(strategy.isQuickBuy).toBe(false);
    expect(strategy.cancelTarget).toStrictEqual({
      type: CancelTargetType.Navigate,
      route: Routes.BRIDGE.BRIDGE_VIEW,
    });
  });

  it('goes back on cancel for the Quick Buy entry point', () => {
    const strategy = resolveFlowStrategy({
      routeParams: { bridgeEntryPoint: BridgeEntryPoint.QuickBuy },
    });

    expect(strategy.flow).toBe(Flow.Bridge);
    expect(strategy.isQuickBuy).toBe(true);
    expect(strategy.cancelTarget).toStrictEqual({
      type: CancelTargetType.GoBack,
    });
  });

  it('ignores the bridge entry point for the send flow', () => {
    const strategy = resolveFlowStrategy({
      routeParams: {
        flow: Flow.Send,
        bridgeEntryPoint: BridgeEntryPoint.QuickBuy,
      },
    });

    expect(strategy.isSendFlow).toBe(true);
    expect(strategy.isQuickBuy).toBe(false);
  });
});
