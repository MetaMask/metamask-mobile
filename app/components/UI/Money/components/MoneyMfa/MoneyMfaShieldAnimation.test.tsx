import React from 'react';
import { act, render } from '@testing-library/react-native';
import { RiveErrorType, type RiveError } from '@rive-app/react-native';
import MoneyMfaShieldAnimation, {
  SHIELD_PLAY_DELAY_MS,
} from './MoneyMfaShieldAnimation';
import { MoneyMfaTestIds } from './MoneyMfa.testIds';
import { useReduceMotion } from '../../hooks/useReduceMotion';
import Logger from '../../../../../util/Logger';

jest.mock('../../../../../util/Logger', () => ({
  __esModule: true,
  default: { error: jest.fn(), log: jest.fn() },
}));

jest.mock('../../hooks/useReduceMotion', () => ({
  useReduceMotion: jest.fn(),
}));

let mockRiveViewReady = true;
const mockRiveView = { reset: jest.fn(), play: jest.fn() };
const mockRiveViewProps: {
  current?: { stateMachineName?: string; onError?: (e: RiveError) => void };
} = {};

jest.mock('@rive-app/react-native', () => {
  const actual = jest.requireActual('@rive-app/react-native');
  const ReactActual = jest.requireActual('react');
  const MockRiveView = (props: Record<string, unknown>) => {
    ReactActual.useEffect(() => {
      mockRiveViewProps.current = props;
    });
    return ReactActual.createElement(actual.RiveView, props);
  };
  return {
    __esModule: true,
    ...actual,
    useRive: () => ({
      riveRef: { current: null },
      riveViewRef: mockRiveViewReady ? mockRiveView : null,
      setHybridRef: { f: jest.fn() },
    }),
    RiveView: MockRiveView,
  };
});

let mockIsFocused = true;
jest.mock('@react-navigation/native', () => ({
  useIsFocused: () => mockIsFocused,
}));

const waitForPlayDelay = async () => {
  await act(async () => {
    jest.advanceTimersByTime(SHIELD_PLAY_DELAY_MS);
  });
};

const mockUseReduceMotion = jest.mocked(useReduceMotion);

describe('MoneyMfaShieldAnimation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockIsFocused = true;
    mockRiveViewReady = true;
    mockRiveView.reset.mockResolvedValue(undefined);
    mockRiveView.play.mockResolvedValue(undefined);
    mockUseReduceMotion.mockReturnValue(false);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('plays the 2FA state machine and hides the static shield once ready', () => {
    const { getByTestId, queryByTestId } = render(
      <MoneyMfaShieldAnimation size={96} />,
    );

    expect(getByTestId(MoneyMfaTestIds.SHIELD_ANIMATION)).toBeOnTheScreen();
    expect(mockRiveViewProps.current?.stateMachineName).toBe('State Machine 1');
    expect(queryByTestId(MoneyMfaTestIds.SHIELD_FALLBACK)).toBeNull();
  });

  it('shows the static shield while the Rive view is not ready', () => {
    mockRiveViewReady = false;

    const { getByTestId } = render(<MoneyMfaShieldAnimation size={96} />);

    expect(getByTestId(MoneyMfaTestIds.SHIELD_FALLBACK)).toBeOnTheScreen();
  });

  it('shows only the static shield when Reduce Motion is on', () => {
    mockUseReduceMotion.mockReturnValue(true);

    const { getByTestId, queryByTestId } = render(
      <MoneyMfaShieldAnimation size={96} />,
    );

    expect(getByTestId(MoneyMfaTestIds.SHIELD_FALLBACK)).toBeOnTheScreen();
    expect(queryByTestId(MoneyMfaTestIds.SHIELD_ANIMATION)).toBeNull();
  });

  it('falls back to the static shield and logs when Rive errors', () => {
    const { getByTestId, queryByTestId } = render(
      <MoneyMfaShieldAnimation size={96} />,
    );

    act(() => {
      mockRiveViewProps.current?.onError?.({
        message: 'bad file',
        type: RiveErrorType.MalformedFile,
      });
    });

    expect(getByTestId(MoneyMfaTestIds.SHIELD_FALLBACK)).toBeOnTheScreen();
    expect(queryByTestId(MoneyMfaTestIds.SHIELD_ANIMATION)).toBeNull();
    expect(Logger.error).toHaveBeenCalledTimes(1);
  });

  it('plays from the start once the screen has been focused for the delay', async () => {
    render(<MoneyMfaShieldAnimation size={96} />);
    expect(mockRiveView.play).not.toHaveBeenCalled();

    await waitForPlayDelay();

    expect(mockRiveView.reset).toHaveBeenCalledTimes(1);
    expect(mockRiveView.play).toHaveBeenCalledTimes(1);
  });

  it('does not play when the screen loses focus before the delay', async () => {
    const { rerender } = render(<MoneyMfaShieldAnimation size={96} />);

    mockIsFocused = false;
    rerender(<MoneyMfaShieldAnimation size={96} />);
    await waitForPlayDelay();

    expect(mockRiveView.play).not.toHaveBeenCalled();
  });

  it('plays again when the screen regains focus', async () => {
    const { rerender } = render(<MoneyMfaShieldAnimation size={96} />);
    await waitForPlayDelay();

    mockIsFocused = false;
    rerender(<MoneyMfaShieldAnimation size={96} />);
    mockIsFocused = true;
    rerender(<MoneyMfaShieldAnimation size={96} />);
    await waitForPlayDelay();

    expect(mockRiveView.play).toHaveBeenCalledTimes(2);
  });

  it('does not play when Reduce Motion is on', async () => {
    mockUseReduceMotion.mockReturnValue(true);
    render(<MoneyMfaShieldAnimation size={96} />);

    await waitForPlayDelay();

    expect(mockRiveView.play).not.toHaveBeenCalled();
  });

  it('logs when playing fails', async () => {
    mockRiveView.play.mockRejectedValueOnce(new Error('play failed'));
    render(<MoneyMfaShieldAnimation size={96} />);

    await waitForPlayDelay();

    expect(Logger.error).toHaveBeenCalledTimes(1);
  });
});
