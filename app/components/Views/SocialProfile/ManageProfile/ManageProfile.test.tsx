import React from 'react';
import { Dimensions, StyleSheet } from 'react-native';
import {
  act,
  fireEvent,
  waitFor,
  within,
  type RenderResult,
} from '@testing-library/react-native';
import type { Profile } from '@metamask/profile-controller';

import ManageProfile from './ManageProfile';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { CommonSelectorsIDs } from '../../../../util/Common.testIds';
import { ManageProfileSelectorsIDs } from './ManageProfile.testIds';
import { PROFILE_FIELD_MAX_LENGTH } from './ManageProfile.constants';
import { ToastContext } from '../../../../component-library/components/Toast';
import Logger from '../../../../util/Logger';
import {
  connectX,
  disconnectX,
  XAuthError,
  XAuthErrorType,
  type XConnectResult,
  type XProfile,
} from '../../../../core/XAuthService';
import {
  selectIsConnectedToX,
  selectXProfile,
} from '../../../../selectors/profileController';

import { DEFAULT_PROFILE_AVATAR_SIZE } from './ProfileAvatar';
import { strings } from '../../../../../locales/i18n';

jest.mock('../../../../core/XAuthService', () => {
  const actual = jest.requireActual('../../../../core/XAuthService');
  return {
    ...actual,
    connectX: jest.fn(),
    disconnectX: jest.fn(),
  };
});

jest.mock('../../../../selectors/profileController', () => ({
  selectIsConnectedToX: jest.fn(),
  selectXProfile: jest.fn(),
}));

const mockConnectX = jest.mocked(connectX);
const mockDisconnectX = jest.mocked(disconnectX);
const mockSelectIsConnectedToX = jest.mocked(selectIsConnectedToX);
const mockSelectXProfile = jest.mocked(selectXProfile);

const X_PROFILE_FIXTURE: XProfile = {
  xUserId: '8472619402',
  xProfileUrl: 'https://x.com/katiedelta',
  username: 'katiedelta',
  displayName: 'Katie Delta',
  avatarUrl: 'https://pbs.twimg.com/profile_images/katiedelta.png',
  createdAt: '2026-01-15T09:30:00.000Z',
  updatedAt: '2026-05-02T14:12:00.000Z',
};

const PROFILE_FIXTURE: Profile = {
  profileId: '9f1c2a44-6a2f-4a7e-9b2e-1f4c8a9d0e11',
  username: 'katiedelta',
  displayName: 'Katie Delta',
  bio: '',
  linkedAddresses: [],
  avatarUrl: '',
  tradingPrivacy: 'private',
  connectedToX: true,
  createdAt: '2026-01-15T09:30:00.000Z',
  updatedAt: '2026-05-02T14:12:00.000Z',
};

const CONNECT_RESULT_FIXTURE: XConnectResult = {
  profile: PROFILE_FIXTURE,
  xProfile: X_PROFILE_FIXTURE,
  profileCreated: false,
};

/** Creates a promise whose settlement the test controls explicitly. */
function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Presses a row/handler that kicks off async work, wrapped in act(). */
async function pressAsync(target: ReturnType<RenderResult['getByTestId']>) {
  await act(async () => {
    fireEvent.press(target);
  });
}

/** Mirrors `VALUE_MAX_WIDTH_RATIO` in ProfileRow. */
const EXPECTED_VALUE_WIDTH_RATIO = 0.45;

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
    }),
  };
});

const mockShowToast = jest.fn();
const mockToastRef = {
  current: { showToast: mockShowToast, closeToast: jest.fn() },
};

/** Renders with a toast ref, as the app root provides. */
const renderManageProfileWithToast = () =>
  renderWithProvider(
    <ToastContext.Provider value={{ toastRef: mockToastRef }}>
      <ManageProfile />
    </ToastContext.Provider>,
  );

/** Flips the connection-state mocks to a linked X account. */
const mockConnectedToX = () => {
  mockSelectIsConnectedToX.mockReturnValue(true);
  mockSelectXProfile.mockReturnValue(X_PROFILE_FIXTURE);
};

describe('ManageProfile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Logger, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger, 'error').mockImplementation(() => undefined);
    mockSelectIsConnectedToX.mockReturnValue(false);
    mockSelectXProfile.mockReturnValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('wraps content in SafeAreaView', () => {
    const { getByTestId } = renderWithProvider(<ManageProfile />);

    expect(getByTestId(ManageProfileSelectorsIDs.SAFE_AREA)).toBeOnTheScreen();
  });

  it('renders HeaderStandard with the manage profile title', () => {
    const { getByTestId } = renderWithProvider(<ManageProfile />);

    const header = getByTestId(ManageProfileSelectorsIDs.HEADER);
    expect(header).toBeOnTheScreen();
    expect(
      within(header).getByText(strings('app_settings.manage_profile.header')),
    ).toBeOnTheScreen();
  });

  it('navigates back when back button is pressed', () => {
    const { getByTestId } = renderWithProvider(<ManageProfile />);

    fireEvent.press(getByTestId(CommonSelectorsIDs.BACK_ARROW_BUTTON));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('renders the profile avatar as a circle, even with no picture set', () => {
    const { getByTestId } = renderWithProvider(<ManageProfile />);

    const avatar = getByTestId(ManageProfileSelectorsIDs.AVATAR);

    expect(avatar).toBeOnTheScreen();
    expect(avatar).toHaveStyle({
      borderRadius: 9999,
      width: DEFAULT_PROFILE_AVATAR_SIZE,
      height: DEFAULT_PROFILE_AVATAR_SIZE,
      overflow: 'hidden',
    });
  });

  it('fills most of the avatar with the placeholder glyph', () => {
    const { getByTestId } = renderWithProvider(<ManageProfile />);

    const glyph = getByTestId(ManageProfileSelectorsIDs.AVATAR).children[0] as {
      props: { style?: { width?: number } };
    };
    const glyphWidth = StyleSheet.flatten(glyph.props.style)?.width;

    // Guards against the glyph falling back to an IconSize token, which tops
    // out at 32px and leaves it looking undersized in a 64px avatar.
    expect(glyphWidth).toBeGreaterThan(DEFAULT_PROFILE_AVATAR_SIZE * 0.75);
    expect(glyphWidth).toBeLessThan(DEFAULT_PROFILE_AVATAR_SIZE);
  });

  it('renders the About and Privacy section headers', () => {
    const { getByText } = renderWithProvider(<ManageProfile />);

    expect(
      getByText(strings('app_settings.manage_profile.about')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('app_settings.manage_profile.privacy')),
    ).toBeOnTheScreen();
  });

  it.each([
    [
      ManageProfileSelectorsIDs.DISPLAY_NAME_ROW,
      'app_settings.manage_profile.display_name',
    ],
    [
      ManageProfileSelectorsIDs.HANDLE_ROW,
      'app_settings.manage_profile.handle',
    ],
    [ManageProfileSelectorsIDs.BIO_ROW, 'app_settings.manage_profile.bio'],
    [
      ManageProfileSelectorsIDs.SOCIALS_ROW,
      'app_settings.manage_profile.socials',
    ],
    [
      ManageProfileSelectorsIDs.TRADING_ACTIVITY_ROW,
      'app_settings.manage_profile.trading_activity',
    ],
    [
      ManageProfileSelectorsIDs.LINKED_SOCIAL_ACCOUNT_ROW,
      'app_settings.manage_profile.linked_social_account',
    ],
  ])('renders the %s row with its label', (testID, labelKey) => {
    const { getByTestId } = renderWithProvider(<ManageProfile />);

    const row = getByTestId(testID);
    expect(within(row).getByText(strings(labelKey))).toBeOnTheScreen();
  });

  describe('empty profile', () => {
    it.each([
      [ManageProfileSelectorsIDs.DISPLAY_NAME_ROW],
      [ManageProfileSelectorsIDs.HANDLE_ROW],
      [ManageProfileSelectorsIDs.BIO_ROW],
      [ManageProfileSelectorsIDs.SOCIALS_ROW],
    ])('shows a placeholder for the unset %s value', (testID) => {
      const { getByTestId } = renderWithProvider(<ManageProfile />);

      expect(
        within(getByTestId(testID)).getByText(
          strings('app_settings.manage_profile.not_set'),
        ),
      ).toBeOnTheScreen();
    });

    it('reports no linked social account', () => {
      const { getByTestId } = renderWithProvider(<ManageProfile />);

      expect(
        within(
          getByTestId(ManageProfileSelectorsIDs.LINKED_SOCIAL_ACCOUNT_ROW),
        ).getByText(strings('app_settings.manage_profile.no_linked_account')),
      ).toBeOnTheScreen();
    });

    it('still renders the trading activity state, which is never unset', () => {
      const { getByTestId } = renderWithProvider(<ManageProfile />);

      expect(
        within(
          getByTestId(ManageProfileSelectorsIDs.TRADING_ACTIVITY_ROW),
        ).getByText(strings('app_settings.manage_profile.off')),
      ).toBeOnTheScreen();
    });

    it('falls back to a generic avatar label when there is no display name', () => {
      const { getByTestId } = renderWithProvider(<ManageProfile />);

      expect(
        getByTestId(ManageProfileSelectorsIDs.AVATAR).props.accessibilityLabel,
      ).toBe(strings('app_settings.manage_profile.avatar_accessibility_label'));
    });
  });

  it('caps the bio value width so it truncates to a single line on the right', () => {
    const { getByTestId } = renderWithProvider(<ManageProfile />);

    const bioValue = within(
      getByTestId(ManageProfileSelectorsIDs.BIO_ROW),
    ).getByText(strings('app_settings.manage_profile.not_set'));

    expect(bioValue.props.numberOfLines).toBe(1);
    expect(bioValue).toHaveStyle({ maxWidth: 120 });
  });

  it('bounds a long saved value so it cannot overflow its row', () => {
    const { getByTestId } = renderWithProvider(<ManageProfile />);
    const longName = 'Yield Whale '.repeat(10).trim();

    fireEvent.press(getByTestId(ManageProfileSelectorsIDs.DISPLAY_NAME_ROW));
    fireEvent.changeText(
      getByTestId(ManageProfileSelectorsIDs.FIELD_SHEET_INPUT),
      longName,
    );
    fireEvent.press(getByTestId(ManageProfileSelectorsIDs.FIELD_SHEET_SAVE));

    const valueText = within(
      getByTestId(ManageProfileSelectorsIDs.DISPLAY_NAME_ROW),
    ).getByText(longName);

    expect(valueText.props.numberOfLines).toBe(1);
    expect(valueText).toHaveStyle({
      maxWidth: Math.round(
        Dimensions.get('window').width * EXPECTED_VALUE_WIDTH_RATIO,
      ),
    });
  });

  it('truncates the label too, so a long value cannot squash it away', () => {
    const { getByTestId } = renderWithProvider(<ManageProfile />);

    const label = within(
      getByTestId(ManageProfileSelectorsIDs.DISPLAY_NAME_ROW),
    ).getByText(strings('app_settings.manage_profile.display_name'));

    expect(label.props.numberOfLines).toBe(1);
  });

  it('opens no sheet until an editable row is pressed', () => {
    const { queryByTestId } = renderWithProvider(<ManageProfile />);

    expect(queryByTestId(ManageProfileSelectorsIDs.FIELD_SHEET)).toBeNull();
  });

  it.each([
    [ManageProfileSelectorsIDs.HANDLE_ROW],
    [ManageProfileSelectorsIDs.SOCIALS_ROW],
  ])('renders the %s row as read-only', (testID) => {
    const { getByTestId } = renderWithProvider(<ManageProfile />);

    // The interactive variant renders a Pressable announced as a button; the
    // read-only variant renders a plain Box.
    expect(getByTestId(testID).props.accessibilityRole).toBeUndefined();
  });

  it.each([
    [ManageProfileSelectorsIDs.DISPLAY_NAME_ROW],
    [ManageProfileSelectorsIDs.BIO_ROW],
    [ManageProfileSelectorsIDs.TRADING_ACTIVITY_ROW],
    [ManageProfileSelectorsIDs.LINKED_SOCIAL_ACCOUNT_ROW],
  ])('keeps the %s row interactive', (testID) => {
    const { getByTestId } = renderWithProvider(<ManageProfile />);

    expect(getByTestId(testID).props.accessibilityRole).toBe('button');
  });

  describe('display name form', () => {
    it('opens an empty text field when the name is unset', () => {
      const { getByTestId } = renderWithProvider(<ManageProfile />);

      fireEvent.press(getByTestId(ManageProfileSelectorsIDs.DISPLAY_NAME_ROW));

      expect(
        getByTestId(ManageProfileSelectorsIDs.FIELD_SHEET),
      ).toBeOnTheScreen();
      // The placeholder is display-only; it must not seed the form.
      expect(
        getByTestId(ManageProfileSelectorsIDs.FIELD_SHEET_INPUT).props.value,
      ).toBe('');
    });

    it('seeds the field with a previously saved value', () => {
      const { getByTestId } = renderWithProvider(<ManageProfile />);

      fireEvent.press(getByTestId(ManageProfileSelectorsIDs.DISPLAY_NAME_ROW));
      fireEvent.changeText(
        getByTestId(ManageProfileSelectorsIDs.FIELD_SHEET_INPUT),
        'Tomato Farmer',
      );
      fireEvent.press(getByTestId(ManageProfileSelectorsIDs.FIELD_SHEET_SAVE));
      fireEvent.press(getByTestId(ManageProfileSelectorsIDs.DISPLAY_NAME_ROW));

      expect(
        getByTestId(ManageProfileSelectorsIDs.FIELD_SHEET_INPUT).props.value,
      ).toBe('Tomato Farmer');
    });

    it('writes the edited value back to the row on save', () => {
      const { getByTestId } = renderWithProvider(<ManageProfile />);

      fireEvent.press(getByTestId(ManageProfileSelectorsIDs.DISPLAY_NAME_ROW));
      fireEvent.changeText(
        getByTestId(ManageProfileSelectorsIDs.FIELD_SHEET_INPUT),
        'Tomato Farmer',
      );
      fireEvent.press(getByTestId(ManageProfileSelectorsIDs.FIELD_SHEET_SAVE));

      expect(
        within(
          getByTestId(ManageProfileSelectorsIDs.DISPLAY_NAME_ROW),
        ).getByText('Tomato Farmer'),
      ).toBeOnTheScreen();
    });

    it('discards the edit when the sheet is closed', () => {
      const { getByTestId } = renderWithProvider(<ManageProfile />);

      fireEvent.press(getByTestId(ManageProfileSelectorsIDs.DISPLAY_NAME_ROW));
      fireEvent.changeText(
        getByTestId(ManageProfileSelectorsIDs.FIELD_SHEET_INPUT),
        'Discarded',
      );
      fireEvent.press(getByTestId(ManageProfileSelectorsIDs.FIELD_SHEET_CLOSE));

      expect(
        within(
          getByTestId(ManageProfileSelectorsIDs.DISPLAY_NAME_ROW),
        ).getByText(strings('app_settings.manage_profile.not_set')),
      ).toBeOnTheScreen();
    });

    it('caps how many characters the field accepts', () => {
      const { getByTestId } = renderWithProvider(<ManageProfile />);

      fireEvent.press(getByTestId(ManageProfileSelectorsIDs.DISPLAY_NAME_ROW));

      expect(
        getByTestId(ManageProfileSelectorsIDs.FIELD_SHEET_INPUT).props
          .maxLength,
      ).toBe(PROFILE_FIELD_MAX_LENGTH.displayName);
    });
  });

  describe('bio form', () => {
    it('opens an empty multiline field when the bio is unset', () => {
      const { getByTestId } = renderWithProvider(<ManageProfile />);

      fireEvent.press(getByTestId(ManageProfileSelectorsIDs.BIO_ROW));

      const input = getByTestId(ManageProfileSelectorsIDs.FIELD_SHEET_INPUT);
      expect(input.props.value).toBe('');
      expect(input.props.multiline).toBe(true);
    });

    it('writes the edited value back to the row on save', () => {
      const { getByTestId } = renderWithProvider(<ManageProfile />);

      fireEvent.press(getByTestId(ManageProfileSelectorsIDs.BIO_ROW));
      fireEvent.changeText(
        getByTestId(ManageProfileSelectorsIDs.FIELD_SHEET_INPUT),
        'Just here for the yield.',
      );
      fireEvent.press(getByTestId(ManageProfileSelectorsIDs.FIELD_SHEET_SAVE));

      expect(
        within(getByTestId(ManageProfileSelectorsIDs.BIO_ROW)).getByText(
          'Just here for the yield.',
        ),
      ).toBeOnTheScreen();
    });
  });

  describe('trading activity form', () => {
    it('opens a switch reflecting the current setting', () => {
      const { getByTestId } = renderWithProvider(<ManageProfile />);

      fireEvent.press(
        getByTestId(ManageProfileSelectorsIDs.TRADING_ACTIVITY_ROW),
      );

      // Switch puts its `testID` on a wrapper View; the control itself is the
      // element carrying the switch role.
      const control = within(
        getByTestId(ManageProfileSelectorsIDs.FIELD_SHEET_SWITCH),
      ).getByRole('switch');

      expect(control.props.value).toBe(false);
    });

    it('renders the privacy card copy and info affordance', () => {
      const { getByTestId } = renderWithProvider(<ManageProfile />);

      fireEvent.press(
        getByTestId(ManageProfileSelectorsIDs.TRADING_ACTIVITY_ROW),
      );

      expect(
        getByTestId(ManageProfileSelectorsIDs.TOGGLE_DESCRIPTION),
      ).toHaveTextContent(
        strings('app_settings.manage_profile.trading_activity_private'),
      );
      expect(
        getByTestId(ManageProfileSelectorsIDs.TOGGLE_HELPER_TEXT),
      ).toHaveTextContent(
        strings('app_settings.manage_profile.trading_activity_footnote'),
      );
      expect(
        getByTestId(ManageProfileSelectorsIDs.TOGGLE_INFO_BUTTON),
      ).toBeOnTheScreen();
    });

    it('swaps the description when toggled on', () => {
      const { getByTestId } = renderWithProvider(<ManageProfile />);

      fireEvent.press(
        getByTestId(ManageProfileSelectorsIDs.TRADING_ACTIVITY_ROW),
      );
      fireEvent(
        getByTestId(ManageProfileSelectorsIDs.FIELD_SHEET_SWITCH),
        'valueChange',
        true,
      );

      expect(
        getByTestId(ManageProfileSelectorsIDs.TOGGLE_DESCRIPTION),
      ).toHaveTextContent(
        strings('app_settings.manage_profile.trading_activity_public'),
      );
    });

    it('offers no save button, since changes apply immediately', () => {
      const { getByTestId, queryByTestId } = renderWithProvider(
        <ManageProfile />,
      );

      fireEvent.press(
        getByTestId(ManageProfileSelectorsIDs.TRADING_ACTIVITY_ROW),
      );

      expect(
        queryByTestId(ManageProfileSelectorsIDs.FIELD_SHEET_SAVE),
      ).toBeNull();
    });

    it('applies the toggle to the row immediately, with no save step', () => {
      const { getByTestId } = renderWithProvider(<ManageProfile />);

      fireEvent.press(
        getByTestId(ManageProfileSelectorsIDs.TRADING_ACTIVITY_ROW),
      );
      fireEvent(
        getByTestId(ManageProfileSelectorsIDs.FIELD_SHEET_SWITCH),
        'valueChange',
        true,
      );
      fireEvent.press(getByTestId(ManageProfileSelectorsIDs.FIELD_SHEET_CLOSE));

      expect(
        within(
          getByTestId(ManageProfileSelectorsIDs.TRADING_ACTIVITY_ROW),
        ).getByText(strings('app_settings.manage_profile.on')),
      ).toBeOnTheScreen();
    });
  });

  describe('linked social account (disconnected)', () => {
    it('opens no field sheet when the row is pressed', async () => {
      const { getByTestId, queryByTestId } = renderManageProfileWithToast();

      await pressAsync(
        getByTestId(ManageProfileSelectorsIDs.LINKED_SOCIAL_ACCOUNT_ROW),
      );

      expect(queryByTestId(ManageProfileSelectorsIDs.FIELD_SHEET)).toBeNull();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('starts the X connect flow when the row is pressed', async () => {
      mockConnectX.mockResolvedValue(CONNECT_RESULT_FIXTURE);
      const { getByTestId } = renderManageProfileWithToast();

      await pressAsync(
        getByTestId(ManageProfileSelectorsIDs.LINKED_SOCIAL_ACCOUNT_ROW),
      );

      expect(mockConnectX).toHaveBeenCalledTimes(1);
    });

    it('shows connecting in the row while the connect flow is in flight, then clears it', async () => {
      const deferred = createDeferred<XConnectResult>();
      mockConnectX.mockReturnValue(deferred.promise);
      const { getByTestId } = renderManageProfileWithToast();
      const row = getByTestId(
        ManageProfileSelectorsIDs.LINKED_SOCIAL_ACCOUNT_ROW,
      );

      await act(async () => {
        fireEvent.press(row);
      });

      expect(
        within(row).getByText(
          strings('app_settings.manage_profile.connecting'),
        ),
      ).toBeOnTheScreen();

      await act(async () => {
        deferred.resolve(CONNECT_RESULT_FIXTURE);
      });

      // The connecting indicator drops once the flow settles; the linked
      // handle itself arrives through the ProfileController state change in
      // Redux, covered by the connected-state tests below.
      expect(
        within(row).getByText(
          strings('app_settings.manage_profile.no_linked_account'),
        ),
      ).toBeOnTheScreen();
    });

    it('ignores a second press while the connect flow is in flight', async () => {
      const deferred = createDeferred<XConnectResult>();
      mockConnectX.mockReturnValue(deferred.promise);
      const { getByTestId } = renderManageProfileWithToast();
      const row = getByTestId(
        ManageProfileSelectorsIDs.LINKED_SOCIAL_ACCOUNT_ROW,
      );

      await act(async () => {
        fireEvent.press(row);
        fireEvent.press(row);
      });

      expect(mockConnectX).toHaveBeenCalledTimes(1);

      await act(async () => {
        deferred.resolve(CONNECT_RESULT_FIXTURE);
      });
    });

    it('accepts another press after the connect flow fails', async () => {
      mockConnectX.mockRejectedValueOnce(new Error('offline'));
      mockConnectX.mockResolvedValueOnce(CONNECT_RESULT_FIXTURE);
      const { getByTestId } = renderManageProfileWithToast();
      const row = getByTestId(
        ManageProfileSelectorsIDs.LINKED_SOCIAL_ACCOUNT_ROW,
      );

      await pressAsync(row);
      await pressAsync(row);

      expect(mockConnectX).toHaveBeenCalledTimes(2);
    });

    it('shows no toast when the user cancels the X authorization', async () => {
      mockConnectX.mockRejectedValue(
        new XAuthError(XAuthErrorType.UserCancelled, 'User cancelled'),
      );
      const { getByTestId } = renderManageProfileWithToast();

      await pressAsync(
        getByTestId(ManageProfileSelectorsIDs.LINKED_SOCIAL_ACCOUNT_ROW),
      );

      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it.each([
      [
        XAuthErrorType.NetworkFailure,
        'app_settings.manage_profile.connect_x_error_network',
      ],
      [
        XAuthErrorType.BackendError,
        'app_settings.manage_profile.connect_x_error_backend',
      ],
      [
        XAuthErrorType.StateMismatch,
        'app_settings.manage_profile.connect_x_error',
      ],
      [
        XAuthErrorType.NotSignedIn,
        'app_settings.manage_profile.connect_x_error',
      ],
    ])(
      'shows the %s toast copy when the connect fails with that error',
      async (errorType, copyKey) => {
        mockConnectX.mockRejectedValue(
          new XAuthError(errorType, 'connect failed'),
        );
        const { getByTestId } = renderManageProfileWithToast();

        await pressAsync(
          getByTestId(ManageProfileSelectorsIDs.LINKED_SOCIAL_ACCOUNT_ROW),
        );

        expect(mockShowToast).toHaveBeenCalledWith(
          expect.objectContaining({
            labelOptions: [{ label: strings(copyKey) }],
          }),
        );
      },
    );

    it('shows the generic toast copy when the connect fails with an unexpected error', async () => {
      mockConnectX.mockRejectedValue(new Error('something unexpected'));
      const { getByTestId } = renderManageProfileWithToast();

      await pressAsync(
        getByTestId(ManageProfileSelectorsIDs.LINKED_SOCIAL_ACCOUNT_ROW),
      );

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          labelOptions: [
            {
              label: strings('app_settings.manage_profile.connect_x_error'),
            },
          ],
        }),
      );
    });
  });

  describe('linked social account (connected)', () => {
    it('shows the linked X handle in the row', () => {
      mockConnectedToX();
      const { getByTestId } = renderManageProfileWithToast();

      const row = getByTestId(
        ManageProfileSelectorsIDs.LINKED_SOCIAL_ACCOUNT_ROW,
      );

      expect(within(row).getByText('@katiedelta')).toBeOnTheScreen();
    });

    it('opens the disconnect confirmation when the row is pressed', async () => {
      mockConnectedToX();
      const { getByTestId } = renderManageProfileWithToast();

      await pressAsync(
        getByTestId(ManageProfileSelectorsIDs.LINKED_SOCIAL_ACCOUNT_ROW),
      );

      expect(
        getByTestId(ManageProfileSelectorsIDs.LINKED_ACCOUNT_SHEET),
      ).toBeOnTheScreen();
      expect(
        getByTestId(ManageProfileSelectorsIDs.LINKED_ACCOUNT_SHEET_ALERT),
      ).toHaveTextContent(
        strings('app_settings.manage_profile.disconnect_x_title_with_handle', {
          handle: '@katiedelta',
        }),
        { exact: false },
      );
      expect(
        getByTestId(ManageProfileSelectorsIDs.LINKED_ACCOUNT_SHEET_DISCONNECT),
      ).toBeOnTheScreen();
      expect(
        getByTestId(ManageProfileSelectorsIDs.LINKED_ACCOUNT_SHEET_CANCEL),
      ).toBeOnTheScreen();
      expect(mockConnectX).not.toHaveBeenCalled();
    });

    it('disconnects when the confirmation button is pressed', async () => {
      mockConnectedToX();
      mockDisconnectX.mockResolvedValue(undefined);
      const { getByTestId } = renderManageProfileWithToast();
      await pressAsync(
        getByTestId(ManageProfileSelectorsIDs.LINKED_SOCIAL_ACCOUNT_ROW),
      );

      await pressAsync(
        getByTestId(ManageProfileSelectorsIDs.LINKED_ACCOUNT_SHEET_DISCONNECT),
      );

      expect(mockDisconnectX).toHaveBeenCalledTimes(1);
    });

    it('closes the confirmation after the disconnect resolves', async () => {
      mockConnectedToX();
      mockDisconnectX.mockResolvedValue(undefined);
      const { getByTestId, queryByTestId } = renderManageProfileWithToast();
      await pressAsync(
        getByTestId(ManageProfileSelectorsIDs.LINKED_SOCIAL_ACCOUNT_ROW),
      );

      await pressAsync(
        getByTestId(ManageProfileSelectorsIDs.LINKED_ACCOUNT_SHEET_DISCONNECT),
      );

      await waitFor(() => {
        expect(
          queryByTestId(ManageProfileSelectorsIDs.LINKED_ACCOUNT_SHEET),
        ).toBeNull();
      });
    });

    it('shows the disconnecting state and ignores repeated presses while the disconnect is in flight', async () => {
      mockConnectedToX();
      const deferred = createDeferred<void>();
      mockDisconnectX.mockReturnValue(deferred.promise);
      const { getByTestId } = renderManageProfileWithToast();
      await pressAsync(
        getByTestId(ManageProfileSelectorsIDs.LINKED_SOCIAL_ACCOUNT_ROW),
      );

      await act(async () => {
        fireEvent.press(
          getByTestId(
            ManageProfileSelectorsIDs.LINKED_ACCOUNT_SHEET_DISCONNECT,
          ),
        );
        fireEvent.press(
          getByTestId(
            ManageProfileSelectorsIDs.LINKED_ACCOUNT_SHEET_DISCONNECT,
          ),
        );
      });

      expect(mockDisconnectX).toHaveBeenCalledTimes(1);
      expect(
        getByTestId(ManageProfileSelectorsIDs.LINKED_ACCOUNT_SHEET_DISCONNECT),
      ).toHaveTextContent(strings('app_settings.manage_profile.disconnecting'));

      await act(async () => {
        deferred.resolve();
      });
    });

    it('keeps the confirmation open and shows a toast when the disconnect fails', async () => {
      mockConnectedToX();
      mockDisconnectX.mockRejectedValue(new Error('backend down'));
      const { getByTestId } = renderManageProfileWithToast();
      await pressAsync(
        getByTestId(ManageProfileSelectorsIDs.LINKED_SOCIAL_ACCOUNT_ROW),
      );

      await pressAsync(
        getByTestId(ManageProfileSelectorsIDs.LINKED_ACCOUNT_SHEET_DISCONNECT),
      );

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          labelOptions: [
            {
              label: strings('app_settings.manage_profile.disconnect_x_error'),
            },
          ],
        }),
      );
      expect(
        getByTestId(ManageProfileSelectorsIDs.LINKED_ACCOUNT_SHEET),
      ).toBeOnTheScreen();
    });

    it('closes the confirmation without disconnecting when cancel is pressed', async () => {
      mockConnectedToX();
      const { getByTestId, queryByTestId } = renderManageProfileWithToast();
      await pressAsync(
        getByTestId(ManageProfileSelectorsIDs.LINKED_SOCIAL_ACCOUNT_ROW),
      );

      await pressAsync(
        getByTestId(ManageProfileSelectorsIDs.LINKED_ACCOUNT_SHEET_CANCEL),
      );

      expect(mockDisconnectX).not.toHaveBeenCalled();
      await waitFor(() => {
        expect(
          queryByTestId(ManageProfileSelectorsIDs.LINKED_ACCOUNT_SHEET),
        ).toBeNull();
      });
    });
  });
});
