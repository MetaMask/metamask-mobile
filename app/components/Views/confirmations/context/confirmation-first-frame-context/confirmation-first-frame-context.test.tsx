import React from 'react';
import { Text } from 'react-native';
import { act, render } from '@testing-library/react-native';
import {
  ConfirmationFirstFrameProvider,
  useConfirmationFirstFrame,
} from './confirmation-first-frame-context';

const NOT_ENABLED = 'not-enabled';

describe('ConfirmationFirstFrameProvider', () => {
  let frames: FrameRequestCallback[];

  beforeEach(() => {
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

  it('completes the first frame only after two frame callbacks', () => {
    const { getByTestId } = render(createProvider());

    expect(getByTestId('state')).toHaveTextContent('false');

    act(() => frames[0](16));
    expect(getByTestId('state')).toHaveTextContent('false');

    act(() => frames[1](32));
    expect(getByTestId('state')).toHaveTextContent('true');
  });

  it('requests exactly two frames across rerenders', () => {
    const { rerender } = render(createProvider());

    rerender(createProvider());
    act(() => frames[0](16));
    rerender(createProvider());
    act(() => frames[1](32));
    rerender(createProvider());

    expect(requestAnimationFrame).toHaveBeenCalledTimes(2);
  });

  it('cancels the pending first frame on unmount', () => {
    const { unmount } = render(createProvider());

    unmount();

    expect(cancelAnimationFrame).toHaveBeenCalledWith(1);
  });

  it('cancels the second frame when unmounted between callbacks', () => {
    const { unmount } = render(createProvider());
    act(() => frames[0](16));

    unmount();

    expect(cancelAnimationFrame).toHaveBeenCalledWith(2);
  });

  it('provides no value and requests no frames when not enabled', () => {
    const { getByTestId } = render(createProvider({ enabled: false }));

    expect(getByTestId('state')).toHaveTextContent(NOT_ENABLED);
    expect(requestAnimationFrame).not.toHaveBeenCalled();
  });

  it('restarts when the transaction changes', () => {
    const { getByTestId, rerender } = render(createProvider());
    act(() => frames[0](16));
    act(() => frames[1](32));

    rerender(createProvider({ transactionId: 'second' }));

    expect(getByTestId('state')).toHaveTextContent('false');
    expect(requestAnimationFrame).toHaveBeenCalledTimes(3);

    act(() => frames[2](48));
    act(() => frames[3](64));
    expect(getByTestId('state')).toHaveTextContent('true');
  });
});

function createProvider({
  enabled = true,
  transactionId = 'first',
}: { enabled?: boolean; transactionId?: string } = {}) {
  return (
    <ConfirmationFirstFrameProvider
      enabled={enabled}
      transactionId={transactionId}
    >
      <FirstFrameConsumer />
    </ConfirmationFirstFrameProvider>
  );
}

function FirstFrameConsumer() {
  const firstFrame = useConfirmationFirstFrame();

  return (
    <Text testID="state">
      {firstFrame ? String(firstFrame.isFirstFrameComplete) : NOT_ENABLED}
    </Text>
  );
}
