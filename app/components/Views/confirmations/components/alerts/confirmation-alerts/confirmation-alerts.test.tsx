import React, { useLayoutEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
import { useAlerts } from '../../../context/alert-system-context';
import { ConfirmationFirstFrameProvider } from '../../../context/confirmation-first-frame-context';
import useConfirmationAlerts from '../../../hooks/alerts/useConfirmationAlerts';
import { Alert, NO_ALERTS, Severity } from '../../../types/alerts';
import { ConfirmationAlerts } from './confirmation-alerts';

jest.mock('../../../hooks/alerts/useConfirmationAlerts');
jest.mock('../../modals/multiple-alert-modal', () => () => null);

const BLOCKING_ALERT: Alert = {
  field: 'amount',
  isBlocking: true,
  key: 'insufficient-balance',
  message: 'Insufficient balance',
  severity: Severity.Danger,
  title: 'Insufficient balance',
};
const mockConfirm = jest.fn();

describe('ConfirmationAlerts', () => {
  let frames: FrameRequestCallback[];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useConfirmationAlerts).mockReturnValue(NO_ALERTS);
    frames = [];
    jest
      .spyOn(global, 'requestAnimationFrame')
      .mockImplementation((callback) => {
        frames.push(callback);
        return frames.length;
      });
    jest.spyOn(global, 'cancelAnimationFrame').mockImplementation(jest.fn());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('keeps children mounted and confirmation blocked until the shared frame yield finishes', () => {
    // Publishing a fresh result must not cause the hook owner to re-render
    // solely because it updated its parent.
    jest.mocked(useConfirmationAlerts).mockImplementation(() => []);
    const { getByTestId } = render(createConfirmation());

    fireEvent.changeText(getByTestId('amount'), '25');
    fireEvent.press(getByTestId('continue'));
    act(() => frames[0](16));

    expect(useConfirmationAlerts).not.toHaveBeenCalled();
    expect(getByTestId('continue')).toBeDisabled();
    expect(mockConfirm).not.toHaveBeenCalled();

    act(() => frames[1](32));

    expect(useConfirmationAlerts).toHaveBeenCalledTimes(1);
    expect(getByTestId('continue')).toBeEnabled();
    expect(getByTestId('amount')).toHaveProp('value', '25');
  });

  it('preserves blocking alerts and publishes subsequent alert changes', () => {
    let updateAlerts: (alerts: Alert[]) => void = jest.fn();
    function useLiveAlerts() {
      const [alerts, setAlerts] = useState([BLOCKING_ALERT]);
      useLayoutEffect(() => {
        updateAlerts = setAlerts;
      }, [setAlerts]);
      return alerts;
    }
    jest.mocked(useConfirmationAlerts).mockImplementation(useLiveAlerts);
    const { getByTestId } = render(createConfirmation());

    act(() => frames[0](16));
    act(() => frames[1](32));
    fireEvent.press(getByTestId('continue'));

    expect(getByTestId('continue')).toBeDisabled();
    expect(getByTestId('alert-key')).toHaveTextContent(BLOCKING_ALERT.key);
    expect(mockConfirm).not.toHaveBeenCalled();

    act(() => updateAlerts(NO_ALERTS));
    fireEvent.press(getByTestId('continue'));

    expect(getByTestId('continue')).toBeEnabled();
    expect(mockConfirm).toHaveBeenCalledTimes(1);
  });

  it('runs alerts immediately when first-frame deferral is disabled', () => {
    const { getByTestId } = render(createConfirmation({ enabled: false }));

    expect(useConfirmationAlerts).toHaveBeenCalled();
    expect(getByTestId('continue')).toBeEnabled();
    expect(requestAnimationFrame).not.toHaveBeenCalled();
  });

  it('cancels the deferred alert mount when dismissed', () => {
    const { unmount } = render(createConfirmation());
    act(() => frames[0](16));

    unmount();
    act(() => frames[1](32));

    expect(cancelAnimationFrame).toHaveBeenCalledWith(2);
    expect(useConfirmationAlerts).not.toHaveBeenCalled();
  });

  it('resets readiness and alert results when the transaction changes', () => {
    const { getByTestId, rerender } = render(createConfirmation());
    act(() => frames[0](16));
    act(() => frames[1](32));
    jest.mocked(useConfirmationAlerts).mockClear();
    jest.mocked(useConfirmationAlerts).mockReturnValue([BLOCKING_ALERT]);

    rerender(createConfirmation({ transactionId: 'next' }));

    expect(getByTestId('continue')).toBeDisabled();
    expect(useConfirmationAlerts).not.toHaveBeenCalled();

    act(() => frames[2](48));
    act(() => frames[3](64));

    expect(useConfirmationAlerts).toHaveBeenCalled();
    expect(getByTestId('continue')).toBeDisabled();
    expect(getByTestId('alert-key')).toHaveTextContent(BLOCKING_ALERT.key);
  });
});

function createConfirmation({
  enabled = true,
  transactionId = 'first',
}: { enabled?: boolean; transactionId?: string } = {}) {
  return (
    <ConfirmationFirstFrameProvider
      enabled={enabled}
      transactionId={transactionId}
    >
      <ConfirmationAlerts>
        <ConfirmationConsumer />
      </ConfirmationAlerts>
    </ConfirmationFirstFrameProvider>
  );
}

function ConfirmationConsumer() {
  const [amount, setAmount] = useState('');
  const { alertKey, hasBlockingAlerts } = useAlerts();
  return (
    <View testID="shell">
      <TextInput onChangeText={setAmount} testID="amount" value={amount} />
      <Text testID="alert-key">{alertKey}</Text>
      <Pressable
        disabled={hasBlockingAlerts}
        onPress={mockConfirm}
        testID="continue"
      >
        <Text>Continue</Text>
      </Pressable>
    </View>
  );
}
