/**
 * Component view tests for PerpsCancelAllOrdersView.
 * State-driven via Redux and stream overrides; no hook mocks.
 * Toast matrix / overlay-close decision lives in
 * resolveCancelAllOrdersFeedback unit tests; toast copy in usePerpsToasts.
 */
import '../../../../../../tests/component-view/mocks';

import React, { useRef } from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import type { BottomSheetRef } from '@metamask/design-system-react-native';
import type { Order } from '@metamask/perps-controller';
import Engine from '../../../../../core/Engine';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { getRouteProbeTestId } from '../../../../../../tests/component-view/render';
import {
  defaultOrderForViews,
  renderPerpsCancelAllOrdersView,
  renderPerpsView,
} from '../../../../../../tests/component-view/renderers/perpsViewRenderer';
import PerpsCancelAllOrdersView from './PerpsCancelAllOrdersView';

const orders: Order[] = [
  defaultOrderForViews,
  {
    ...defaultOrderForViews,
    orderId: 'order_view_2',
    symbol: 'BTC',
    side: 'sell',
    size: '0.2',
    originalSize: '0.2',
    price: '52000',
  },
];

const perpsHomeExtraRoutes = [
  { name: Routes.PERPS.PERPS_HOME, mount: 'perps-root' as const },
];

describe('PerpsCancelAllOrdersView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('confirms cancelling every open order from the bulk cancel sheet', async () => {
    const cancelOrders = Engine.context.PerpsController
      .cancelOrders as jest.Mock;

    renderPerpsCancelAllOrdersView({
      streamOverrides: { orders },
      extraRoutes: perpsHomeExtraRoutes,
    });

    expect(
      await screen.findByText(strings('perps.cancel_all_modal.title')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.cancel_all_modal.description')),
    ).toBeOnTheScreen();

    fireEvent.press(
      screen.getByText(strings('perps.cancel_all_modal.confirm')),
    );

    await waitFor(() => {
      expect(cancelOrders).toHaveBeenCalledWith({ cancelAll: true });
    });
  });

  it('does not expose the cancel action when there are no open orders', async () => {
    const cancelOrders = Engine.context.PerpsController
      .cancelOrders as jest.Mock;

    renderPerpsCancelAllOrdersView({
      streamOverrides: { orders: [] },
    });

    expect(
      await screen.findByText(strings('perps.order.no_orders')),
    ).toBeOnTheScreen();
    expect(
      screen.queryByText(strings('perps.cancel_all_modal.confirm')),
    ).not.toBeOnTheScreen();
    expect(cancelOrders).not.toHaveBeenCalled();
  });

  it('navigates to Perps home when keep orders is pressed without back history', async () => {
    const { findByTestId } = renderPerpsCancelAllOrdersView({
      streamOverrides: { orders },
      extraRoutes: perpsHomeExtraRoutes,
    });

    expect(
      await screen.findByText(strings('perps.cancel_all_modal.keep_orders')),
    ).toBeOnTheScreen();

    fireEvent.press(
      screen.getByText(strings('perps.cancel_all_modal.keep_orders')),
    );

    expect(
      await findByTestId(getRouteProbeTestId(Routes.PERPS.PERPS_HOME)),
    ).toBeOnTheScreen();
  });

  it('keeps confirm available while cancel all is in progress', async () => {
    const cancelOrders = Engine.context.PerpsController
      .cancelOrders as jest.Mock;

    let resolveCancel: (value: {
      success: boolean;
      successCount: number;
      failureCount: number;
    }) => void = () => undefined;
    cancelOrders.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCancel = resolve;
        }),
    );

    renderPerpsCancelAllOrdersView({
      streamOverrides: { orders },
      extraRoutes: perpsHomeExtraRoutes,
    });

    fireEvent.press(
      await screen.findByText(strings('perps.cancel_all_modal.confirm')),
    );

    expect(
      screen.getByText(strings('perps.cancel_all_modal.description')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.cancel_all_modal.confirm')),
    ).toBeOnTheScreen();
    expect(
      screen.queryByText(strings('perps.cancel_all_modal.canceling')),
    ).toBeNull();

    resolveCancel({ success: true, successCount: 2, failureCount: 0 });

    await waitFor(() => {
      expect(cancelOrders).toHaveBeenCalled();
    });
  });

  it('closes the overlay when header close is pressed with an external sheetRef', async () => {
    const onClose = jest.fn();

    const OverlayCancelAll = () => {
      const sheetRef = useRef<BottomSheetRef | null>(null);
      return <PerpsCancelAllOrdersView sheetRef={sheetRef} onClose={onClose} />;
    };

    renderPerpsView(
      OverlayCancelAll as unknown as React.ComponentType,
      Routes.PERPS.MODALS.CANCEL_ALL_ORDERS,
      { streamOverrides: { orders } },
    );

    fireEvent.press(await screen.findByTestId('header-close'));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('closes the overlay when keep orders is pressed with an external sheetRef', async () => {
    const onClose = jest.fn();

    const OverlayCancelAll = () => {
      const sheetRef = useRef<BottomSheetRef | null>(null);
      return <PerpsCancelAllOrdersView sheetRef={sheetRef} onClose={onClose} />;
    };

    renderPerpsView(
      OverlayCancelAll as unknown as React.ComponentType,
      Routes.PERPS.MODALS.CANCEL_ALL_ORDERS,
      { streamOverrides: { orders } },
    );

    fireEvent.press(
      await screen.findByText(strings('perps.cancel_all_modal.keep_orders')),
    );

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('closes the overlay when cancel all succeeds with an external sheetRef', async () => {
    const onClose = jest.fn();
    const cancelOrders = Engine.context.PerpsController
      .cancelOrders as jest.Mock;
    cancelOrders.mockResolvedValue({
      success: true,
      successCount: 2,
      failureCount: 0,
    });

    const OverlayCancelAll = () => {
      const sheetRef = useRef<BottomSheetRef | null>(null);
      return <PerpsCancelAllOrdersView sheetRef={sheetRef} onClose={onClose} />;
    };

    renderPerpsView(
      OverlayCancelAll as unknown as React.ComponentType,
      Routes.PERPS.MODALS.CANCEL_ALL_ORDERS,
      { streamOverrides: { orders } },
    );

    fireEvent.press(
      await screen.findByText(strings('perps.cancel_all_modal.confirm')),
    );

    await waitFor(() => {
      expect(cancelOrders).toHaveBeenCalledWith({ cancelAll: true });
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('closes the overlay when cancel all reports a partial success', async () => {
    const onClose = jest.fn();
    const cancelOrders = Engine.context.PerpsController
      .cancelOrders as jest.Mock;
    cancelOrders.mockResolvedValue({
      success: false,
      successCount: 1,
      failureCount: 1,
    });

    const OverlayCancelAll = () => {
      const sheetRef = useRef<BottomSheetRef | null>(null);
      return <PerpsCancelAllOrdersView sheetRef={sheetRef} onClose={onClose} />;
    };

    renderPerpsView(
      OverlayCancelAll as unknown as React.ComponentType,
      Routes.PERPS.MODALS.CANCEL_ALL_ORDERS,
      { streamOverrides: { orders } },
    );

    fireEvent.press(
      await screen.findByText(strings('perps.cancel_all_modal.confirm')),
    );

    await waitFor(() => {
      expect(cancelOrders).toHaveBeenCalledWith({ cancelAll: true });
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('keeps the overlay open when cancel all fails', async () => {
    const onClose = jest.fn();
    const cancelOrders = Engine.context.PerpsController
      .cancelOrders as jest.Mock;
    cancelOrders.mockRejectedValue(new Error('Network timeout'));

    const OverlayCancelAll = () => {
      const sheetRef = useRef<BottomSheetRef | null>(null);
      return <PerpsCancelAllOrdersView sheetRef={sheetRef} onClose={onClose} />;
    };

    renderPerpsView(
      OverlayCancelAll as unknown as React.ComponentType,
      Routes.PERPS.MODALS.CANCEL_ALL_ORDERS,
      { streamOverrides: { orders } },
    );

    fireEvent.press(
      await screen.findByText(strings('perps.cancel_all_modal.confirm')),
    );

    await waitFor(() => {
      expect(cancelOrders).toHaveBeenCalledWith({ cancelAll: true });
    });
    expect(onClose).not.toHaveBeenCalled();
    expect(
      screen.getByText(strings('perps.cancel_all_modal.title')),
    ).toBeOnTheScreen();
  });

  it('does not close the overlay when cancel all reports zero successes', async () => {
    const onClose = jest.fn();
    const cancelOrders = Engine.context.PerpsController
      .cancelOrders as jest.Mock;
    cancelOrders.mockResolvedValue({
      success: false,
      successCount: 0,
      failureCount: 2,
    });

    const OverlayCancelAll = () => {
      const sheetRef = useRef<BottomSheetRef | null>(null);
      return <PerpsCancelAllOrdersView sheetRef={sheetRef} onClose={onClose} />;
    };

    renderPerpsView(
      OverlayCancelAll as unknown as React.ComponentType,
      Routes.PERPS.MODALS.CANCEL_ALL_ORDERS,
      { streamOverrides: { orders } },
    );

    fireEvent.press(
      await screen.findByText(strings('perps.cancel_all_modal.confirm')),
    );

    await waitFor(() => {
      expect(cancelOrders).toHaveBeenCalledWith({ cancelAll: true });
    });
    expect(onClose).not.toHaveBeenCalled();
  });
});
