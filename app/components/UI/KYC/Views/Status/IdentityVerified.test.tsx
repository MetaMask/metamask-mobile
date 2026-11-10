import React from 'react';
import { act, fireEvent } from '@testing-library/react-native';
import { CommonActions } from '@react-navigation/native';
import { strings } from '../../../../../../locales/i18n';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import Routes from '../../../../../constants/navigation/Routes';
import KycIdentityVerified, {
  KycIdentityVerifiedSelectorsIDs,
} from './IdentityVerified';
import { useTrackKycResultViewed } from '../../hooks/useTrackKycResultViewed';
import { useReduceMotionState } from '../../../Money/hooks/useReduceMotion';
import { VerifiedCheckAnimationSelectors } from '../../components/VerifiedCheckAnimation.testIds';
import { VERIFIED_SUCCESS_ENTRANCE_START_TIMEOUT_MS } from '../../hooks/useVerifiedSuccessCascade';
import { __resetRiveMocks } from '../../../../../__mocks__/rive-app-react-native';

jest.mock('../../hooks/useTrackKycResultViewed');

jest.mock('../../../Money/hooks/useReduceMotion', () => ({
  useReduceMotionState: jest.fn(() => true),
  useReduceMotion: jest.fn(() => true),
}));

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

/** Runs the entrance (fallback start plus the cascade) to the end. */
const finishEntrance = () =>
  act(() => {
    jest.advanceTimersByTime(VERIFIED_SUCCESS_ENTRANCE_START_TIMEOUT_MS + 2000);
  });

const getFooter = (
  getByTestId: (id: string) => {
    props: { pointerEvents?: string };
    parent?: unknown;
  },
) => {
  let node:
    | { props: { pointerEvents?: string }; parent?: unknown }
    | undefined = getByTestId(KycIdentityVerifiedSelectorsIDs.CONTINUE_BUTTON);
  while (node) {
    if (
      node.props.pointerEvents === 'none' ||
      node.props.pointerEvents === 'auto'
    ) {
      return node;
    }
    node = node.parent as typeof node;
  }
  throw new Error('Could not find the Continue footer wrapper');
};

const mockNavigate = jest.fn();
const mockParentDispatch = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    dispatch: jest.fn(),
    getState: () => ({
      index: 0,
      routeNames: ['VbaIdentityVerified'],
      routes: [{ name: 'VbaIdentityVerified' }],
    }),
    getParent: () => ({
      navigate: jest.fn(),
      dispatch: mockParentDispatch,
      getState: () => ({
        index: 0,
        routeNames: ['Home', 'RampVbaOnboarding', 'RampVbaDetails'],
        routes: [{ name: 'Home' }],
      }),
      getParent: () => undefined,
    }),
  }),
}));

jest.mock('../../../../../core/Engine', () => ({
  context: {
    RampsController: {
      registerMoneyAccountWallet: jest.fn(),
      createAutoramp: jest.fn(),
    },
  },
}));

describe('KycIdentityVerified', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    __resetRiveMocks();
    mockUseReduceMotionState.mockReturnValue(true);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders copy and opens details from Continue without creating an account', () => {
    const { getByTestId, getByText } = renderWithProvider(
      <KycIdentityVerified />,
    );

    expect(getByText(strings('kyc.identity_verified.title'))).toBeOnTheScreen();
    expect(
      getByText(strings('kyc.identity_verified.description')),
    ).toBeOnTheScreen();

    fireEvent.press(
      getByTestId(KycIdentityVerifiedSelectorsIDs.CONTINUE_BUTTON),
    );

    expect(mockParentDispatch).toHaveBeenCalledWith(
      CommonActions.reset({
        index: 1,
        routes: [{ name: Routes.HOME_TABS }, { name: Routes.RAMP.VBA_DETAILS }],
      }),
    );
  });

  it('returns to Money home from Back', () => {
    const { getByTestId } = renderWithProvider(<KycIdentityVerified />);

    fireEvent.press(getByTestId(KycIdentityVerifiedSelectorsIDs.BACK_BUTTON));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.HOME_TABS, {
      screen: Routes.MONEY.ROOT,
      params: { screen: Routes.MONEY.HOME },
    });
  });

  it('reports the approved result as viewed', () => {
    renderWithProvider(<KycIdentityVerified />);

    expect(useTrackKycResultViewed).toHaveBeenCalledWith('approved');
  });

  it('ignores taps on the button until its fade-in starts', () => {
    mockUseReduceMotionState.mockReturnValue(false);

    const { getByTestId } = renderWithProvider(<KycIdentityVerified />);

    expect(getFooter(getByTestId)).toHaveProp('pointerEvents', 'none');
    fireEvent.press(
      getByTestId(KycIdentityVerifiedSelectorsIDs.CONTINUE_BUTTON),
    );
    expect(mockParentDispatch).not.toHaveBeenCalled();

    finishEntrance();

    expect(getFooter(getByTestId)).toHaveProp('pointerEvents', 'auto');
  });

  it('makes the button pressable straight away under Reduce Motion', () => {
    const { getByTestId } = renderWithProvider(<KycIdentityVerified />);

    expect(getFooter(getByTestId)).toHaveProp('pointerEvents', 'auto');
  });

  it('draws the tick in with Rive when Reduce Motion is off', () => {
    mockUseReduceMotionState.mockReturnValue(false);

    const { getByTestId, queryByTestId } = renderWithProvider(
      <KycIdentityVerified />,
    );

    expect(
      getByTestId(VerifiedCheckAnimationSelectors.CHECK_ANIMATION),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(VerifiedCheckAnimationSelectors.CHECK_IMAGE),
    ).not.toBeOnTheScreen();
  });

  it('shows the static checkmark and all content under Reduce Motion', () => {
    const { getByTestId, getByText, queryByTestId } = renderWithProvider(
      <KycIdentityVerified />,
    );

    expect(
      getByTestId(VerifiedCheckAnimationSelectors.CHECK_IMAGE),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(VerifiedCheckAnimationSelectors.CHECK_ANIMATION),
    ).not.toBeOnTheScreen();
    expect(getByText(strings('kyc.identity_verified.title'))).toBeOnTheScreen();
    expect(
      getByTestId(KycIdentityVerifiedSelectorsIDs.CONTINUE_BUTTON),
    ).toBeOnTheScreen();
  });

  it('shows neither checkmark while the Reduce Motion check is pending', () => {
    mockUseReduceMotionState.mockReturnValue(null);

    const { queryByTestId } = renderWithProvider(<KycIdentityVerified />);

    expect(
      queryByTestId(VerifiedCheckAnimationSelectors.CHECK_ANIMATION),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(VerifiedCheckAnimationSelectors.CHECK_IMAGE),
    ).not.toBeOnTheScreen();
  });
});
