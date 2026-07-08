import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import { strings } from '../../../../../../locales/i18n';
import { ImpactMoment, playImpact } from '../../../../../util/haptics';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import LeaderboardOptOutBottomSheet from './LeaderboardOptOutBottomSheet';
import { LeaderboardOptOutBottomSheetSelectorsIDs } from './LeaderboardOptOutBottomSheet.testIds';

const mockGoBack = jest.fn();
const mockMessengerCall = jest.fn().mockResolvedValue(undefined);
const mockLoggerError = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({ goBack: mockGoBack }),
  };
});

jest.mock('../../../../../core/Engine', () => ({
  controllerMessenger: {
    call: (...args: unknown[]) => mockMessengerCall(...args),
  },
}));

jest.mock('../../../../../util/Logger', () => ({
  error: (...args: unknown[]) => mockLoggerError(...args),
}));

jest.mock('../../../../../util/haptics', () => ({
  ...jest.requireActual('../../../../../util/haptics'),
  playImpact: jest.fn(),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  const MockBottomSheet = ReactActual.forwardRef(
    (
      props: { children?: React.ReactNode; testID?: string },
      ref: React.Ref<{ onCloseBottomSheet: (cb?: () => void) => void }>,
    ) => {
      ReactActual.useImperativeHandle(ref, () => ({
        onCloseBottomSheet: (cb?: () => void) => cb?.(),
      }));
      return ReactActual.createElement(
        View,
        { testID: props.testID ?? 'bottom-sheet' },
        props.children,
      );
    },
  );
  return { ...actual, BottomSheet: MockBottomSheet };
});

const mockPlayImpact = jest.mocked(playImpact);

describe('LeaderboardOptOutBottomSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMessengerCall.mockResolvedValue(undefined);
  });

  it('renders the description and opt-out CTA', () => {
    renderWithProvider(<LeaderboardOptOutBottomSheet />);

    expect(
      screen.getByTestId(LeaderboardOptOutBottomSheetSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('social_leaderboard.opt_out.description')),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(
        LeaderboardOptOutBottomSheetSelectorsIDs.OPT_OUT_BUTTON,
      ),
    ).toBeOnTheScreen();
  });

  it('calls SocialController:optOutOfLeaderboard and fires a haptic when pressed', async () => {
    renderWithProvider(<LeaderboardOptOutBottomSheet />);

    fireEvent.press(
      screen.getByTestId(
        LeaderboardOptOutBottomSheetSelectorsIDs.OPT_OUT_BUTTON,
      ),
    );

    expect(mockPlayImpact).toHaveBeenCalledWith(
      ImpactMoment.QuickAmountSelection,
    );
    await waitFor(() =>
      expect(mockMessengerCall).toHaveBeenCalledWith(
        'SocialController:optOutOfLeaderboard',
      ),
    );
  });

  it('logs and does not crash when the opt-out call fails', async () => {
    mockMessengerCall.mockRejectedValueOnce(new Error('network down'));

    renderWithProvider(<LeaderboardOptOutBottomSheet />);

    fireEvent.press(
      screen.getByTestId(
        LeaderboardOptOutBottomSheetSelectorsIDs.OPT_OUT_BUTTON,
      ),
    );

    await waitFor(() => expect(mockLoggerError).toHaveBeenCalled());
  });
});
