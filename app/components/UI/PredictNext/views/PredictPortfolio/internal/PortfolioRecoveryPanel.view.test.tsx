import '../../../../../../../tests/component-view/mocks';
import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import Engine from '../../../../../../core/Engine';
import { strings } from '../../../../../../../locales/i18n';
import type { PredictVenueId } from '../../../types';
import { PortfolioRecoveryPanel } from './PortfolioRecoveryPanel';

const venueId = 'kalshi' as PredictVenueId;
const call = jest.mocked(Engine.controllerMessenger.call);
const subscribe = jest.mocked(Engine.controllerMessenger.subscribe);
const unsubscribe = jest.mocked(Engine.controllerMessenger.unsubscribe);

beforeEach(() => {
  jest.clearAllMocks();
  call.mockImplementation(((action: string) =>
    action === 'PredictOrderService:getRecovery'
      ? []
      : Promise.resolve()) as never);
});

describe('PortfolioRecoveryPanel', () => {
  it('shows a restored unknown outcome and refreshes observations without approval or POST', async () => {
    call.mockImplementation(((action: string) =>
      action === 'PredictOrderService:getRecovery'
        ? [{ previewId: 'preview-one', status: 'checking' }]
        : Promise.resolve()) as never);
    const view = render(<PortfolioRecoveryPanel venueId={venueId} />);
    expect(
      view.getByText(strings('predict_next.order_receipt.reconciling_title')),
    ).toBeTruthy();
    await act(async () => {
      fireEvent.press(view.getByTestId('predict-recovery-refresh'));
    });
    expect(call).toHaveBeenCalledWith(
      'PredictOrderService:refreshRecovery',
      venueId,
    );
    expect(
      call.mock.calls.every(
        ([action]) =>
          action === 'PredictOrderService:getRecovery' ||
          action === 'PredictOrderService:refreshRecovery',
      ),
    ).toBe(true);
    view.unmount();
    expect(unsubscribe).toHaveBeenCalledWith(
      'PredictOrderService:recoveryChanged',
      expect.any(Function),
    );
  });

  it('shows manual review honestly without offering a new approval', () => {
    call.mockReturnValue([
      { previewId: 'preview-one', status: 'needs_manual_review' },
    ] as never);
    const view = render(<PortfolioRecoveryPanel venueId={venueId} />);
    expect(
      view.getByText(
        strings('predict_next.order_receipt.needs_review_description'),
      ),
    ).toBeTruthy();
    expect(view.queryByTestId('predict-recovery-refresh')).toBeNull();
  });

  it('updates from recovery events and hides prior identity outcomes when cleared', () => {
    const view = render(<PortfolioRecoveryPanel venueId={venueId} />);
    const listener = subscribe.mock.calls[0][1] as (payload: unknown) => void;
    act(() =>
      listener({
        venueId,
        operations: [{ previewId: 'pending', status: 'checking' }],
      }),
    );
    expect(view.getByTestId('predict-recovery-panel')).toBeTruthy();
    act(() => listener({ venueId: 'other', operations: [] }));
    expect(view.getByTestId('predict-recovery-panel')).toBeTruthy();
    act(() => listener({ venueId, operations: [] }));
    expect(view.queryByTestId('predict-recovery-panel')).toBeNull();
  });
});
