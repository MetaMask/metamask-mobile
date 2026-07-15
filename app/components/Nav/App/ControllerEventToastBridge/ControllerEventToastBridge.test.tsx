import React from 'react';
import { render } from '@testing-library/react-native';

import { ToastContext } from '../../../../component-library/components/Toast';
import Engine from '../../../../core/Engine';

import ControllerEventToastBridge from './ControllerEventToastBridge';
import type { ToastRegistration } from './ControllerEventToastBridge.types';

jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: {
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  },
}));

describe('ControllerEventToastBridge', () => {
  const mockShowToast = jest.fn();
  const toastRef = {
    current: {
      showToast: mockShowToast,
      closeToast: jest.fn(),
    },
  };

  const mockSubscribe = Engine.controllerMessenger.subscribe as jest.Mock;
  const mockUnsubscribe = Engine.controllerMessenger.unsubscribe as jest.Mock;

  const renderBridge = (registrations: ToastRegistration[]) =>
    render(
      <ToastContext.Provider value={{ toastRef }}>
        <ControllerEventToastBridge registrations={registrations} />
      </ToastContext.Provider>,
    );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('subscribes to registered events on mount', () => {
    const registrations: ToastRegistration[] = [
      { eventName: 'PredictController:eventA', handler: jest.fn() },
      { eventName: 'PredictController:eventB', handler: jest.fn() },
    ];

    renderBridge(registrations);

    expect(mockSubscribe).toHaveBeenCalledTimes(2);
    expect(mockSubscribe).toHaveBeenNthCalledWith(
      1,
      'PredictController:eventA',
      expect.any(Function),
    );
    expect(mockSubscribe).toHaveBeenNthCalledWith(
      2,
      'PredictController:eventB',
      expect.any(Function),
    );
  });

  it('unsubscribes from registered events on unmount', () => {
    const registrations: ToastRegistration[] = [
      { eventName: 'PredictController:eventA', handler: jest.fn() },
      { eventName: 'PredictController:eventB', handler: jest.fn() },
    ];

    const { unmount } = renderBridge(registrations);

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalledTimes(2);
    expect(mockUnsubscribe).toHaveBeenNthCalledWith(
      1,
      'PredictController:eventA',
      expect.any(Function),
    );
    expect(mockUnsubscribe).toHaveBeenNthCalledWith(
      2,
      'PredictController:eventB',
      expect.any(Function),
    );
  });

  it('calls handler with payload and showToast when subscribed event fires', () => {
    const eventHandlers = new Map<string, (payload: unknown) => void>();
    mockSubscribe.mockImplementation(
      (eventName: string, callback: (payload: unknown) => void) => {
        eventHandlers.set(eventName, callback);
      },
    );

    const handler = jest.fn();
    const payload = { id: 'tx-1' };
    const registrations: ToastRegistration[] = [
      {
        eventName: 'PredictController:transactionStatusChanged',
        handler,
      },
    ];

    renderBridge(registrations);

    eventHandlers.get('PredictController:transactionStatusChanged')?.({
      ...payload,
    });

    expect(handler).toHaveBeenCalledWith(payload, mockShowToast);
  });

  it('passes noop showToast when toast ref is unavailable', () => {
    const eventHandlers = new Map<string, (payload: unknown) => void>();
    mockSubscribe.mockImplementation(
      (eventName: string, callback: (payload: unknown) => void) => {
        eventHandlers.set(eventName, callback);
      },
    );

    const handler = jest.fn();
    const payload = { id: 'tx-2' };
    const registrations: ToastRegistration[] = [
      {
        eventName: 'PredictController:transactionStatusChanged',
        handler,
      },
    ];

    const nullToastRef = { current: null };

    render(
      <ToastContext.Provider value={{ toastRef: nullToastRef }}>
        <ControllerEventToastBridge registrations={registrations} />
      </ToastContext.Provider>,
    );

    eventHandlers.get('PredictController:transactionStatusChanged')?.(payload);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0]).toEqual(payload);
    expect(typeof handler.mock.calls[0][1]).toBe('function');
    expect(() => handler.mock.calls[0][1]()).not.toThrow();
  });

  it('subscribes to all handlers when multiple registrations are provided', () => {
    const registrations: ToastRegistration[] = [
      { eventName: 'Controller:eventA', handler: jest.fn() },
      { eventName: 'Controller:eventB', handler: jest.fn() },
      { eventName: 'Controller:eventC', handler: jest.fn() },
    ];

    renderBridge(registrations);

    expect(mockSubscribe).toHaveBeenCalledTimes(3);
  });

  it('re-subscribes when registrations change', () => {
    const registrationsA: ToastRegistration[] = [
      { eventName: 'Controller:eventA', handler: jest.fn() },
    ];
    const registrationsB: ToastRegistration[] = [
      { eventName: 'Controller:eventB', handler: jest.fn() },
      { eventName: 'Controller:eventC', handler: jest.fn() },
    ];

    const { rerender } = render(
      <ToastContext.Provider value={{ toastRef }}>
        <ControllerEventToastBridge registrations={registrationsA} />
      </ToastContext.Provider>,
    );

    rerender(
      <ToastContext.Provider value={{ toastRef }}>
        <ControllerEventToastBridge registrations={registrationsB} />
      </ToastContext.Provider>,
    );

    expect(mockUnsubscribe).toHaveBeenCalledWith(
      'Controller:eventA',
      expect.any(Function),
    );
    expect(mockSubscribe).toHaveBeenCalledWith(
      'Controller:eventB',
      expect.any(Function),
    );
    expect(mockSubscribe).toHaveBeenCalledWith(
      'Controller:eventC',
      expect.any(Function),
    );
  });

  it('renders null', () => {
    const registrations: ToastRegistration[] = [];

    const { toJSON } = renderBridge(registrations);

    expect(toJSON()).toBeNull();
  });
});
