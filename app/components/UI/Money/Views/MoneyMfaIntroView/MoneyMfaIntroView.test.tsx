import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import MoneyMfaIntroView from './MoneyMfaIntroView';
import { MoneyMfaIntroViewTestIds } from './MoneyMfaIntroView.testIds';
import Routes from '../../../../../constants/navigation/Routes';
import {
  COMPONENT_NAMES,
  MONEY_BUTTON_INTENTS,
  MONEY_BUTTON_TYPES,
} from '../../constants/moneyEvents';

const mockGoBack = jest.fn();
const mockTurnOn = jest.fn();
const mockTrackButtonClicked = jest.fn();
const mockTrackComponentViewed = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: mockGoBack }),
}));

let mockRootRoutes: { name: string }[] = [];
let mockStateListener: (() => void) | undefined;
const mockStopNavigation = jest.fn();
jest.mock('../../../../../core/NavigationService', () => ({
  __esModule: true,
  default: {
    navigation: {
      getRootState: () => ({ routes: mockRootRoutes }),
      addListener: (_event: string, listener: () => void) => {
        mockStateListener = listener;
        return mockStopNavigation;
      },
    },
  },
}));

let mockActiveFlow: object | undefined;
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
    mockRootRoutes = [];
    mockActiveFlow = undefined;
    mockStateListener = undefined;
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

    expect(mockTurnOn).toHaveBeenCalledTimes(1);
    expect(mockGoBack).not.toHaveBeenCalled();
    expect(mockTrackButtonClicked).toHaveBeenCalledWith({
      button_type: MONEY_BUTTON_TYPES.TEXT,
      button_intent: MONEY_BUTTON_INTENTS.ENABLE_MFA,
      label_key: 'money.mfa.intro_continue',
    });
  });

  it('closes once the 2-step verification screen is on top', () => {
    pressContinue();

    mockRootRoutes = [{ name: 'Main' }, { name: Routes.MFA.FLOW }];
    act(() => mockStateListener?.());

    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(mockStopNavigation).toHaveBeenCalled();
  });

  it('ignores navigation changes that do not open the 2-step verification screen', () => {
    pressContinue();

    mockRootRoutes = [{ name: 'Main' }];
    act(() => mockStateListener?.());

    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('closes when the flow ends without opening a screen', () => {
    pressContinue();

    mockActiveFlow = {};
    act(() => mockFlowListener?.());
    expect(mockGoBack).not.toHaveBeenCalled();
    mockActiveFlow = undefined;
    act(() => mockFlowListener?.());

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('closes when setup returns without a flow', async () => {
    mockTurnOn.mockResolvedValue(undefined);

    pressContinue();
    await act(async () => undefined);

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('closes only once and ignores a second Continue', async () => {
    mockTurnOn.mockResolvedValue(undefined);
    const { getByTestId } = pressContinue();
    fireEvent.press(getByTestId(MoneyMfaIntroViewTestIds.CONTINUE_BUTTON));

    mockRootRoutes = [{ name: Routes.MFA.FLOW }];
    act(() => mockStateListener?.());
    await act(async () => undefined);

    expect(mockTurnOn).toHaveBeenCalledTimes(1);
    expect(mockGoBack).toHaveBeenCalledTimes(1);
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
