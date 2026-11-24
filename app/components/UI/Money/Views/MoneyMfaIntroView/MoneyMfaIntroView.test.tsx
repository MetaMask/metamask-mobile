import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import MoneyMfaIntroView, { FLOW_ENTER_MS } from './MoneyMfaIntroView';
import { MoneyMfaIntroViewTestIds } from './MoneyMfaIntroView.testIds';
import {
  COMPONENT_NAMES,
  MONEY_BUTTON_INTENTS,
  MONEY_BUTTON_TYPES,
} from '../../constants/moneyEvents';

const mockGoBack = jest.fn();
const mockSetOptions = jest.fn();
const mockTurnOn = jest.fn();
const mockTrackButtonClicked = jest.fn();
const mockTrackComponentViewed = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: mockGoBack, setOptions: mockSetOptions }),
}));

let mockStepName = 'idle';
let mockStepListener: (() => void) | undefined;
const mockStopStep = jest.fn();
const createFlow = () => ({
  getState: () => ({ step: { name: mockStepName } }),
  subscribe: (listener: () => void) => {
    mockStepListener = listener;
    return mockStopStep;
  },
});

let mockActiveFlow: ReturnType<typeof createFlow> | undefined;
let mockFlowListener: (() => void) | undefined;
jest.mock('../../../../../util/identity/mfa/engine/activeFlow', () => ({
  getActiveMfaFlow: () => mockActiveFlow,
  subscribeToActiveMfaFlow: (listener: () => void) => {
    mockFlowListener = listener;
    return jest.fn();
  },
}));

jest.mock('../../hooks/useMoneyMfa', () => ({
  useMoneyMfa: () => ({ turnOn: mockTurnOn }),
}));

jest.mock('../../hooks/useMoneyAnalytics', () => ({
  useMoneyAnalytics: jest.fn(() => ({
    trackButtonClicked: mockTrackButtonClicked,
    trackComponentViewed: mockTrackComponentViewed,
  })),
}));

jest.mock('../../components/MoneyMfa/MoneyMfaShieldAnimation', () => {
  const { View } = jest.requireActual('react-native');
  return { __esModule: true, default: () => <View /> };
});

describe('MoneyMfaIntroView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStepName = 'idle';
    mockActiveFlow = undefined;
    mockStepListener = undefined;
    mockFlowListener = undefined;
    mockTurnOn.mockReturnValue(new Promise(() => undefined));
  });

  const pressContinue = () => {
    const screen = render(<MoneyMfaIntroView />);
    fireEvent.press(
      screen.getByTestId(MoneyMfaIntroViewTestIds.CONTINUE_BUTTON),
    );
    return screen;
  };

  const startFlow = () => {
    mockActiveFlow = createFlow();
    act(() => mockFlowListener?.());
  };

  const showStep = (name: string) => {
    mockStepName = name;
    act(() => mockStepListener?.());
  };

  const endFlow = () => {
    mockActiveFlow = undefined;
    act(() => mockFlowListener?.());
  };

  it('renders the title, description and actions', () => {
    const { getByTestId, getByText } = render(<MoneyMfaIntroView />);

    expect(getByTestId(MoneyMfaIntroViewTestIds.CONTAINER)).toBeOnTheScreen();
    expect(
      getByText(strings('money.mfa.intro_screen_title')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('money.mfa.intro_screen_description')),
    ).toBeOnTheScreen();
    expect(
      getByTestId(MoneyMfaIntroViewTestIds.CONTINUE_BUTTON),
    ).toHaveTextContent(strings('money.mfa.intro_continue'));
    expect(
      getByTestId(MoneyMfaIntroViewTestIds.NOT_NOW_BUTTON),
    ).toHaveTextContent(strings('money.mfa.intro_not_now'));
  });

  it('tracks the view on mount', () => {
    render(<MoneyMfaIntroView />);

    expect(mockTrackComponentViewed).toHaveBeenCalledTimes(1);
  });

  it('starts 2-step verification setup on Continue and stays open until its screen opens', () => {
    pressContinue();

    expect(mockTurnOn).toHaveBeenCalledWith('card');
    expect(mockGoBack).not.toHaveBeenCalled();
    expect(mockTrackButtonClicked).toHaveBeenCalledWith({
      button_type: MONEY_BUTTON_TYPES.TEXT,
      button_intent: MONEY_BUTTON_INTENTS.ENABLE_MFA,
      label_key: 'money.mfa.intro_continue',
    });
  });

  it('closes once a full-screen step has slid over it', () => {
    jest.useFakeTimers();
    pressContinue();

    startFlow();
    showStep('intro');
    showStep('totpSetup');
    expect(mockGoBack).not.toHaveBeenCalled();
    act(() => jest.advanceTimersByTime(FLOW_ENTER_MS));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(mockSetOptions).toHaveBeenCalledWith({ animation: 'none' });
    expect(mockStopStep).toHaveBeenCalled();
    jest.useRealTimers();
  });

  it('closes when the flow starts on a full-screen step', () => {
    jest.useFakeTimers();
    mockStepName = 'intro';
    pressContinue();

    startFlow();
    act(() => jest.advanceTimersByTime(FLOW_ENTER_MS));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });

  it('stays under the picker sheet until the flow ends', () => {
    jest.useFakeTimers();
    pressContinue();

    startFlow();
    showStep('picker');
    act(() => jest.advanceTimersByTime(FLOW_ENTER_MS));
    expect(mockGoBack).not.toHaveBeenCalled();
    endFlow();

    expect(mockGoBack).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });

  it('does not close after unmounting while a full-screen step slides in', () => {
    jest.useFakeTimers();
    const { unmount } = pressContinue();

    startFlow();
    showStep('intro');
    unmount();
    act(() => jest.advanceTimersByTime(FLOW_ENTER_MS));

    expect(mockGoBack).not.toHaveBeenCalled();
    jest.useRealTimers();
  });

  it('does not go back when setup finishes after the intro was left', async () => {
    let finishSetup: () => void = () => undefined;
    mockTurnOn.mockReturnValue(
      new Promise<void>((resolve) => {
        finishSetup = resolve;
      }),
    );
    const { unmount } = pressContinue();

    unmount();
    await act(async () => finishSetup());

    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('closes when setup returns without a flow', async () => {
    mockTurnOn.mockResolvedValue(undefined);

    pressContinue();
    await act(async () => undefined);

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('closes only once and ignores a second Continue', async () => {
    jest.useFakeTimers();
    mockTurnOn.mockResolvedValue(undefined);
    const { getByTestId } = pressContinue();
    fireEvent.press(getByTestId(MoneyMfaIntroViewTestIds.CONTINUE_BUTTON));

    startFlow();
    showStep('intro');
    await act(async () => undefined);
    act(() => jest.advanceTimersByTime(FLOW_ENTER_MS));

    expect(mockTurnOn).toHaveBeenCalledTimes(1);
    expect(mockGoBack).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });

  it('closes without starting setup on Not now', () => {
    const { getByTestId } = render(<MoneyMfaIntroView />);

    fireEvent.press(getByTestId(MoneyMfaIntroViewTestIds.NOT_NOW_BUTTON));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(mockTurnOn).not.toHaveBeenCalled();
  });

  it('uses the intro component name for analytics', () => {
    const { useMoneyAnalytics } = jest.requireMock(
      '../../hooks/useMoneyAnalytics',
    );

    render(<MoneyMfaIntroView />);

    expect(useMoneyAnalytics).toHaveBeenCalledWith({
      component_name: COMPONENT_NAMES.MONEY_MFA_INTRO,
    });
  });
});
