import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import {
  RiveErrorType,
  __fireRiveViewError,
  __resetRiveMocks,
} from '../../../../../__mocks__/rive-app-react-native';
import { strings } from '../../../../../../locales/i18n';
import { useReduceMotionState } from '../../../Money/hooks/useReduceMotion';
import CardVerifiedContent, {
  COMPLETE_ENTRANCE_START_TIMEOUT_MS,
} from './CardVerifiedContent';
import { CompleteSelectors } from './Complete.testIds';

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: jest.fn((className?: string) => ({ className })),
  }),
}));

jest.mock('../../../Money/hooks/useReduceMotion', () => ({
  useReduceMotionState: jest.fn(() => false),
}));

jest.mock('../../../KYC/components/Illustration', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    KycIllustrationSource: {
      scanner: 'scanner',
      checkmark: 'checkmark',
      hazard: 'hazard',
    },
    default: () =>
      ReactActual.createElement(View, { testID: 'vba-illustration' }),
  };
});

jest.mock('../../../MarketingMomentTitle', () => {
  const ReactActual = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      children,
      testID,
    }: {
      children: React.ReactNode;
      testID?: string;
    }) => ReactActual.createElement(Text, { testID }, children),
  };
});

const mockUseReduceMotionState = jest.mocked(useReduceMotionState);

/** Runs the fallback entrance start plus the cascade that reveals the button. */
const finishEntrance = () => {
  act(() => {
    jest.advanceTimersByTime(COMPLETE_ENTRANCE_START_TIMEOUT_MS + 2000);
  });
};

describe('CardVerifiedContent', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    __resetRiveMocks();
    mockUseReduceMotionState.mockReturnValue(false);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders the default verified copy and Finish setup button', () => {
    mockUseReduceMotionState.mockReturnValue(true);

    const { getByTestId } = render(
      <CardVerifiedContent onContinue={jest.fn()} />,
    );

    expect(getByTestId(CompleteSelectors.TITLE)).toHaveTextContent(
      strings('card.card_onboarding.complete.title'),
    );
    expect(getByTestId(CompleteSelectors.DESCRIPTION)).toHaveTextContent(
      strings('card.card_onboarding.complete.description'),
    );
    expect(getByTestId(CompleteSelectors.CONFIRM_BUTTON)).toHaveTextContent(
      strings('card.card_onboarding.complete.confirm_button'),
    );
    expect(getByTestId(CompleteSelectors.IMAGE)).toBeOnTheScreen();
  });

  it('uses the description and button label the caller passes', () => {
    mockUseReduceMotionState.mockReturnValue(true);

    const { getByTestId } = render(
      <CardVerifiedContent
        onContinue={jest.fn()}
        description="We're getting your card ready."
        confirmLabel="Continue"
      />,
    );

    expect(getByTestId(CompleteSelectors.DESCRIPTION)).toHaveTextContent(
      "We're getting your card ready.",
    );
    expect(getByTestId(CompleteSelectors.CONFIRM_BUTTON)).toHaveTextContent(
      'Continue',
    );
    expect(getByTestId(CompleteSelectors.TITLE)).toHaveTextContent(
      strings('card.card_onboarding.complete.title'),
    );
  });

  it('calls onContinue when Finish setup is pressed', () => {
    mockUseReduceMotionState.mockReturnValue(true);
    const onContinue = jest.fn();

    const { getByTestId } = render(
      <CardVerifiedContent onContinue={onContinue} />,
    );

    fireEvent.press(getByTestId(CompleteSelectors.CONFIRM_BUTTON));

    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('disables the button while the caller is navigating', () => {
    mockUseReduceMotionState.mockReturnValue(true);
    const onContinue = jest.fn();

    const { getByTestId } = render(
      <CardVerifiedContent onContinue={onContinue} isLoading />,
    );

    expect(getByTestId(CompleteSelectors.CONFIRM_BUTTON)).toBeDisabled();
  });

  it('ignores presses until the entrance starts', () => {
    const onContinue = jest.fn();

    const { getByTestId } = render(
      <CardVerifiedContent onContinue={onContinue} />,
    );

    expect(getByTestId(CompleteSelectors.FOOTER)).toHaveProp(
      'pointerEvents',
      'none',
    );
    fireEvent.press(getByTestId(CompleteSelectors.CONFIRM_BUTTON));
    expect(onContinue).not.toHaveBeenCalled();

    finishEntrance();

    expect(getByTestId(CompleteSelectors.FOOTER)).toHaveProp(
      'pointerEvents',
      'auto',
    );
    fireEvent.press(getByTestId(CompleteSelectors.CONFIRM_BUTTON));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('makes the button pressable immediately under Reduce Motion', () => {
    mockUseReduceMotionState.mockReturnValue(true);

    const { getByTestId, queryByTestId } = render(
      <CardVerifiedContent onContinue={jest.fn()} />,
    );

    expect(getByTestId(CompleteSelectors.FOOTER)).toHaveProp(
      'pointerEvents',
      'auto',
    );
    expect(getByTestId(CompleteSelectors.CHECK_IMAGE)).toBeOnTheScreen();
    expect(
      queryByTestId(CompleteSelectors.CHECK_ANIMATION),
    ).not.toBeOnTheScreen();
  });

  it('plays the tick when Reduce Motion is off', () => {
    const { getByTestId, queryByTestId } = render(
      <CardVerifiedContent onContinue={jest.fn()} />,
    );

    expect(getByTestId(CompleteSelectors.CHECK_ANIMATION)).toBeOnTheScreen();
    expect(queryByTestId(CompleteSelectors.CHECK_IMAGE)).not.toBeOnTheScreen();
  });

  it('shows neither checkmark while the Reduce Motion check is pending', () => {
    mockUseReduceMotionState.mockReturnValue(null);

    const { getByTestId, queryByTestId } = render(
      <CardVerifiedContent onContinue={jest.fn()} />,
    );

    expect(
      queryByTestId(CompleteSelectors.CHECK_ANIMATION),
    ).not.toBeOnTheScreen();
    expect(queryByTestId(CompleteSelectors.CHECK_IMAGE)).not.toBeOnTheScreen();
    expect(getByTestId(CompleteSelectors.FOOTER)).toHaveProp(
      'pointerEvents',
      'none',
    );
  });

  it('starts the entrance when the tick animation fails', () => {
    const { getByTestId } = render(
      <CardVerifiedContent onContinue={jest.fn()} />,
    );

    act(() => {
      __fireRiveViewError({
        message: 'load failed',
        type: RiveErrorType.MalformedFile,
      });
    });
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(getByTestId(CompleteSelectors.CHECK_IMAGE)).toBeOnTheScreen();
    expect(getByTestId(CompleteSelectors.FOOTER)).toHaveProp(
      'pointerEvents',
      'auto',
    );
  });
});
