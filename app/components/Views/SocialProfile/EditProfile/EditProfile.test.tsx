import React from 'react';
import { Dimensions, StyleSheet } from 'react-native';
import { fireEvent, within } from '@testing-library/react-native';

import EditProfile from './EditProfile';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { CommonSelectorsIDs } from '../../../../util/Common.testIds';
import { EditProfileSelectorsIDs } from './EditProfile.testIds';
import { PROFILE_FIELD_MAX_LENGTH } from './EditProfile.constants';

import { DEFAULT_PROFILE_AVATAR_SIZE } from './ProfileAvatar';
import { strings } from '../../../../../locales/i18n';

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

describe('EditProfile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('wraps content in SafeAreaView', () => {
    const { getByTestId } = renderWithProvider(<EditProfile />);

    expect(getByTestId(EditProfileSelectorsIDs.SAFE_AREA)).toBeOnTheScreen();
  });

  it('renders HeaderStandard with the manage profile title', () => {
    const { getByTestId } = renderWithProvider(<EditProfile />);

    const header = getByTestId(EditProfileSelectorsIDs.HEADER);
    expect(header).toBeOnTheScreen();
    expect(
      within(header).getByText(strings('app_settings.edit_profile.header')),
    ).toBeOnTheScreen();
  });

  it('navigates back when back button is pressed', () => {
    const { getByTestId } = renderWithProvider(<EditProfile />);

    fireEvent.press(getByTestId(CommonSelectorsIDs.BACK_ARROW_BUTTON));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('renders the profile avatar as a circle, even with no picture set', () => {
    const { getByTestId } = renderWithProvider(<EditProfile />);

    const avatar = getByTestId(EditProfileSelectorsIDs.AVATAR);

    expect(avatar).toBeOnTheScreen();
    expect(avatar).toHaveStyle({
      borderRadius: 9999,
      width: DEFAULT_PROFILE_AVATAR_SIZE,
      height: DEFAULT_PROFILE_AVATAR_SIZE,
      overflow: 'hidden',
    });
  });

  it('fills most of the avatar with the placeholder glyph', () => {
    const { getByTestId } = renderWithProvider(<EditProfile />);

    const glyph = getByTestId(EditProfileSelectorsIDs.AVATAR).children[0] as {
      props: { style?: { width?: number } };
    };
    const glyphWidth = StyleSheet.flatten(glyph.props.style)?.width;

    // Guards against the glyph falling back to an IconSize token, which tops
    // out at 32px and leaves it looking undersized in a 64px avatar.
    expect(glyphWidth).toBeGreaterThan(DEFAULT_PROFILE_AVATAR_SIZE * 0.75);
    expect(glyphWidth).toBeLessThan(DEFAULT_PROFILE_AVATAR_SIZE);
  });

  it('renders the About and Privacy section headers', () => {
    const { getByText } = renderWithProvider(<EditProfile />);

    expect(
      getByText(strings('app_settings.edit_profile.about')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('app_settings.edit_profile.privacy')),
    ).toBeOnTheScreen();
  });

  it.each([
    [
      EditProfileSelectorsIDs.DISPLAY_NAME_ROW,
      'app_settings.edit_profile.display_name',
    ],
    [EditProfileSelectorsIDs.HANDLE_ROW, 'app_settings.edit_profile.handle'],
    [EditProfileSelectorsIDs.BIO_ROW, 'app_settings.edit_profile.bio'],
    [EditProfileSelectorsIDs.SOCIALS_ROW, 'app_settings.edit_profile.socials'],
    [
      EditProfileSelectorsIDs.TRADING_ACTIVITY_ROW,
      'app_settings.edit_profile.trading_activity',
    ],
    [
      EditProfileSelectorsIDs.LINKED_SOCIAL_ACCOUNT_ROW,
      'app_settings.edit_profile.linked_social_account',
    ],
  ])('renders the %s row with its label', (testID, labelKey) => {
    const { getByTestId } = renderWithProvider(<EditProfile />);

    const row = getByTestId(testID);
    expect(within(row).getByText(strings(labelKey))).toBeOnTheScreen();
  });

  describe('empty profile', () => {
    it.each([
      [EditProfileSelectorsIDs.DISPLAY_NAME_ROW],
      [EditProfileSelectorsIDs.HANDLE_ROW],
      [EditProfileSelectorsIDs.BIO_ROW],
      [EditProfileSelectorsIDs.SOCIALS_ROW],
    ])('shows a placeholder for the unset %s value', (testID) => {
      const { getByTestId } = renderWithProvider(<EditProfile />);

      expect(
        within(getByTestId(testID)).getByText(
          strings('app_settings.edit_profile.not_set'),
        ),
      ).toBeOnTheScreen();
    });

    it('reports no linked social account', () => {
      const { getByTestId } = renderWithProvider(<EditProfile />);

      expect(
        within(
          getByTestId(EditProfileSelectorsIDs.LINKED_SOCIAL_ACCOUNT_ROW),
        ).getByText(strings('app_settings.edit_profile.no_linked_account')),
      ).toBeOnTheScreen();
    });

    it('still renders the trading activity state, which is never unset', () => {
      const { getByTestId } = renderWithProvider(<EditProfile />);

      expect(
        within(
          getByTestId(EditProfileSelectorsIDs.TRADING_ACTIVITY_ROW),
        ).getByText(strings('app_settings.edit_profile.off')),
      ).toBeOnTheScreen();
    });

    it('falls back to a generic avatar label when there is no display name', () => {
      const { getByTestId } = renderWithProvider(<EditProfile />);

      expect(
        getByTestId(EditProfileSelectorsIDs.AVATAR).props.accessibilityLabel,
      ).toBe(strings('app_settings.edit_profile.avatar_accessibility_label'));
    });
  });

  it('caps the bio value width so it truncates to a single line on the right', () => {
    const { getByTestId } = renderWithProvider(<EditProfile />);

    const bioValue = within(
      getByTestId(EditProfileSelectorsIDs.BIO_ROW),
    ).getByText(strings('app_settings.edit_profile.not_set'));

    expect(bioValue.props.numberOfLines).toBe(1);
    expect(bioValue).toHaveStyle({ maxWidth: 120 });
  });

  it('bounds a long saved value so it cannot overflow its row', () => {
    const { getByTestId } = renderWithProvider(<EditProfile />);
    const longName = 'Yield Whale '.repeat(10).trim();

    fireEvent.press(getByTestId(EditProfileSelectorsIDs.DISPLAY_NAME_ROW));
    fireEvent.changeText(
      getByTestId(EditProfileSelectorsIDs.FIELD_SHEET_INPUT),
      longName,
    );
    fireEvent.press(getByTestId(EditProfileSelectorsIDs.FIELD_SHEET_SAVE));

    const valueText = within(
      getByTestId(EditProfileSelectorsIDs.DISPLAY_NAME_ROW),
    ).getByText(longName);

    expect(valueText.props.numberOfLines).toBe(1);
    expect(valueText).toHaveStyle({
      maxWidth: Math.round(
        Dimensions.get('window').width * EXPECTED_VALUE_WIDTH_RATIO,
      ),
    });
  });

  it('truncates the label too, so a long value cannot squash it away', () => {
    const { getByTestId } = renderWithProvider(<EditProfile />);

    const label = within(
      getByTestId(EditProfileSelectorsIDs.DISPLAY_NAME_ROW),
    ).getByText(strings('app_settings.edit_profile.display_name'));

    expect(label.props.numberOfLines).toBe(1);
  });

  it('opens no sheet until an editable row is pressed', () => {
    const { queryByTestId } = renderWithProvider(<EditProfile />);

    expect(queryByTestId(EditProfileSelectorsIDs.FIELD_SHEET)).toBeNull();
  });

  it('leaves the not-yet-wired linked social account row inert', () => {
    const { getByTestId, queryByTestId } = renderWithProvider(<EditProfile />);

    fireEvent.press(
      getByTestId(EditProfileSelectorsIDs.LINKED_SOCIAL_ACCOUNT_ROW),
    );

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(queryByTestId(EditProfileSelectorsIDs.FIELD_SHEET)).toBeNull();
  });

  it.each([
    [EditProfileSelectorsIDs.HANDLE_ROW],
    [EditProfileSelectorsIDs.SOCIALS_ROW],
  ])('renders the %s row as read-only', (testID) => {
    const { getByTestId } = renderWithProvider(<EditProfile />);

    // The interactive variant renders a Pressable announced as a button; the
    // read-only variant renders a plain Box.
    expect(getByTestId(testID).props.accessibilityRole).toBeUndefined();
  });

  it.each([
    [EditProfileSelectorsIDs.DISPLAY_NAME_ROW],
    [EditProfileSelectorsIDs.BIO_ROW],
    [EditProfileSelectorsIDs.TRADING_ACTIVITY_ROW],
    [EditProfileSelectorsIDs.LINKED_SOCIAL_ACCOUNT_ROW],
  ])('keeps the %s row interactive', (testID) => {
    const { getByTestId } = renderWithProvider(<EditProfile />);

    expect(getByTestId(testID).props.accessibilityRole).toBe('button');
  });

  describe('display name form', () => {
    it('opens an empty text field when the name is unset', () => {
      const { getByTestId } = renderWithProvider(<EditProfile />);

      fireEvent.press(getByTestId(EditProfileSelectorsIDs.DISPLAY_NAME_ROW));

      expect(
        getByTestId(EditProfileSelectorsIDs.FIELD_SHEET),
      ).toBeOnTheScreen();
      // The placeholder is display-only; it must not seed the form.
      expect(
        getByTestId(EditProfileSelectorsIDs.FIELD_SHEET_INPUT).props.value,
      ).toBe('');
    });

    it('seeds the field with a previously saved value', () => {
      const { getByTestId } = renderWithProvider(<EditProfile />);

      fireEvent.press(getByTestId(EditProfileSelectorsIDs.DISPLAY_NAME_ROW));
      fireEvent.changeText(
        getByTestId(EditProfileSelectorsIDs.FIELD_SHEET_INPUT),
        'Tomato Farmer',
      );
      fireEvent.press(getByTestId(EditProfileSelectorsIDs.FIELD_SHEET_SAVE));
      fireEvent.press(getByTestId(EditProfileSelectorsIDs.DISPLAY_NAME_ROW));

      expect(
        getByTestId(EditProfileSelectorsIDs.FIELD_SHEET_INPUT).props.value,
      ).toBe('Tomato Farmer');
    });

    it('writes the edited value back to the row on save', () => {
      const { getByTestId } = renderWithProvider(<EditProfile />);

      fireEvent.press(getByTestId(EditProfileSelectorsIDs.DISPLAY_NAME_ROW));
      fireEvent.changeText(
        getByTestId(EditProfileSelectorsIDs.FIELD_SHEET_INPUT),
        'Tomato Farmer',
      );
      fireEvent.press(getByTestId(EditProfileSelectorsIDs.FIELD_SHEET_SAVE));

      expect(
        within(getByTestId(EditProfileSelectorsIDs.DISPLAY_NAME_ROW)).getByText(
          'Tomato Farmer',
        ),
      ).toBeOnTheScreen();
    });

    it('discards the edit when the sheet is closed', () => {
      const { getByTestId } = renderWithProvider(<EditProfile />);

      fireEvent.press(getByTestId(EditProfileSelectorsIDs.DISPLAY_NAME_ROW));
      fireEvent.changeText(
        getByTestId(EditProfileSelectorsIDs.FIELD_SHEET_INPUT),
        'Discarded',
      );
      fireEvent.press(getByTestId(EditProfileSelectorsIDs.FIELD_SHEET_CLOSE));

      expect(
        within(getByTestId(EditProfileSelectorsIDs.DISPLAY_NAME_ROW)).getByText(
          strings('app_settings.edit_profile.not_set'),
        ),
      ).toBeOnTheScreen();
    });

    it('caps how many characters the field accepts', () => {
      const { getByTestId } = renderWithProvider(<EditProfile />);

      fireEvent.press(getByTestId(EditProfileSelectorsIDs.DISPLAY_NAME_ROW));

      expect(
        getByTestId(EditProfileSelectorsIDs.FIELD_SHEET_INPUT).props.maxLength,
      ).toBe(PROFILE_FIELD_MAX_LENGTH.displayName);
    });
  });

  describe('bio form', () => {
    it('opens an empty multiline field when the bio is unset', () => {
      const { getByTestId } = renderWithProvider(<EditProfile />);

      fireEvent.press(getByTestId(EditProfileSelectorsIDs.BIO_ROW));

      const input = getByTestId(EditProfileSelectorsIDs.FIELD_SHEET_INPUT);
      expect(input.props.value).toBe('');
      expect(input.props.multiline).toBe(true);
    });

    it('writes the edited value back to the row on save', () => {
      const { getByTestId } = renderWithProvider(<EditProfile />);

      fireEvent.press(getByTestId(EditProfileSelectorsIDs.BIO_ROW));
      fireEvent.changeText(
        getByTestId(EditProfileSelectorsIDs.FIELD_SHEET_INPUT),
        'Just here for the yield.',
      );
      fireEvent.press(getByTestId(EditProfileSelectorsIDs.FIELD_SHEET_SAVE));

      expect(
        within(getByTestId(EditProfileSelectorsIDs.BIO_ROW)).getByText(
          'Just here for the yield.',
        ),
      ).toBeOnTheScreen();
    });
  });

  describe('trading activity form', () => {
    it('opens a switch reflecting the current setting', () => {
      const { getByTestId } = renderWithProvider(<EditProfile />);

      fireEvent.press(
        getByTestId(EditProfileSelectorsIDs.TRADING_ACTIVITY_ROW),
      );

      // Switch puts its `testID` on a wrapper View; the control itself is the
      // element carrying the switch role.
      const control = within(
        getByTestId(EditProfileSelectorsIDs.FIELD_SHEET_SWITCH),
      ).getByRole('switch');

      expect(control.props.value).toBe(false);
    });

    it('renders the privacy card copy and info affordance', () => {
      const { getByTestId } = renderWithProvider(<EditProfile />);

      fireEvent.press(
        getByTestId(EditProfileSelectorsIDs.TRADING_ACTIVITY_ROW),
      );

      expect(
        getByTestId(EditProfileSelectorsIDs.TOGGLE_DESCRIPTION),
      ).toHaveTextContent(
        strings('app_settings.edit_profile.trading_activity_private'),
      );
      expect(
        getByTestId(EditProfileSelectorsIDs.TOGGLE_HELPER_TEXT),
      ).toHaveTextContent(
        strings('app_settings.edit_profile.trading_activity_footnote'),
      );
      expect(
        getByTestId(EditProfileSelectorsIDs.TOGGLE_INFO_BUTTON),
      ).toBeOnTheScreen();
    });

    it('swaps the description when toggled on', () => {
      const { getByTestId } = renderWithProvider(<EditProfile />);

      fireEvent.press(
        getByTestId(EditProfileSelectorsIDs.TRADING_ACTIVITY_ROW),
      );
      fireEvent(
        getByTestId(EditProfileSelectorsIDs.FIELD_SHEET_SWITCH),
        'valueChange',
        true,
      );

      expect(
        getByTestId(EditProfileSelectorsIDs.TOGGLE_DESCRIPTION),
      ).toHaveTextContent(
        strings('app_settings.edit_profile.trading_activity_public'),
      );
    });

    it('offers no save button, since changes apply immediately', () => {
      const { getByTestId, queryByTestId } = renderWithProvider(
        <EditProfile />,
      );

      fireEvent.press(
        getByTestId(EditProfileSelectorsIDs.TRADING_ACTIVITY_ROW),
      );

      expect(
        queryByTestId(EditProfileSelectorsIDs.FIELD_SHEET_SAVE),
      ).toBeNull();
    });

    it('applies the toggle to the row immediately, with no save step', () => {
      const { getByTestId } = renderWithProvider(<EditProfile />);

      fireEvent.press(
        getByTestId(EditProfileSelectorsIDs.TRADING_ACTIVITY_ROW),
      );
      fireEvent(
        getByTestId(EditProfileSelectorsIDs.FIELD_SHEET_SWITCH),
        'valueChange',
        true,
      );
      fireEvent.press(getByTestId(EditProfileSelectorsIDs.FIELD_SHEET_CLOSE));

      expect(
        within(
          getByTestId(EditProfileSelectorsIDs.TRADING_ACTIVITY_ROW),
        ).getByText(strings('app_settings.edit_profile.on')),
      ).toBeOnTheScreen();
    });
  });
});
