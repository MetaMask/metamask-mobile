import React from 'react';
import { Dimensions, StyleSheet } from 'react-native';
import { fireEvent, within } from '@testing-library/react-native';

import ManageProfile from './ManageProfile';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { CommonSelectorsIDs } from '../../../../util/Common.testIds';
import Routes from '../../../../constants/navigation/Routes';
import { ManageProfileSelectorsIDs } from './ManageProfile.testIds';
import { ManageProfileFieldName } from './ManageProfileField.types';

import { DEFAULT_PROFILE_AVATAR_SIZE } from './ProfileAvatar';
import { strings } from '../../../../../locales/i18n';

/** Mirrors `VALUE_MAX_WIDTH_RATIO` in ProfileRow. */
const EXPECTED_VALUE_WIDTH_RATIO = 0.45;

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockSetParams = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  goBack: mockGoBack,
  setParams: mockSetParams,
};
let mockRouteParams: {
  fieldUpdate?: { field: string; value: string | boolean };
} = {};

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => mockNavigation,
    useRoute: () => ({ params: mockRouteParams }),
  };
});

describe('ManageProfile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = {};
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
      ManageProfileSelectorsIDs.X_ACCOUNT_ROW,
      'app_settings.manage_profile.x_account',
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
      [ManageProfileSelectorsIDs.X_ACCOUNT_ROW],
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
    const longName = 'Yield Whale '.repeat(10).trim();
    mockRouteParams = {
      fieldUpdate: {
        field: ManageProfileFieldName.DisplayName,
        value: longName,
      },
    };

    const { getByTestId } = renderWithProvider(<ManageProfile />);

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

  it('does not navigate until an editable row is pressed', () => {
    renderWithProvider(<ManageProfile />);

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('leaves the not-yet-wired linked social account row inert', () => {
    const { getByTestId } = renderWithProvider(<ManageProfile />);

    fireEvent.press(
      getByTestId(ManageProfileSelectorsIDs.LINKED_SOCIAL_ACCOUNT_ROW),
    );

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('renders the handle row as read-only', () => {
    const { getByTestId } = renderWithProvider(<ManageProfile />);

    // The interactive variant renders a Pressable announced as a button; the
    // read-only variant renders a plain Box.
    expect(
      getByTestId(ManageProfileSelectorsIDs.HANDLE_ROW).props.accessibilityRole,
    ).toBeUndefined();
  });

  it.each([
    [ManageProfileSelectorsIDs.DISPLAY_NAME_ROW],
    [ManageProfileSelectorsIDs.BIO_ROW],
    [ManageProfileSelectorsIDs.X_ACCOUNT_ROW],
    [ManageProfileSelectorsIDs.TRADING_ACTIVITY_ROW],
    [ManageProfileSelectorsIDs.LINKED_SOCIAL_ACCOUNT_ROW],
  ])('keeps the %s row interactive', (testID) => {
    const { getByTestId } = renderWithProvider(<ManageProfile />);

    expect(getByTestId(testID).props.accessibilityRole).toBe('button');
  });

  describe('field navigation', () => {
    it('navigates to the display name editor with an empty value', () => {
      const { getByTestId } = renderWithProvider(<ManageProfile />);

      fireEvent.press(getByTestId(ManageProfileSelectorsIDs.DISPLAY_NAME_ROW));

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.SOCIAL_PROFILE.MANAGE_PROFILE_FIELD,
        {
          field: ManageProfileFieldName.DisplayName,
          initialValue: '',
        },
      );
    });

    it('navigates to the empty X account screen', () => {
      const { getByTestId } = renderWithProvider(<ManageProfile />);

      fireEvent.press(getByTestId(ManageProfileSelectorsIDs.X_ACCOUNT_ROW));

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.SOCIAL_PROFILE.X_ACCOUNT,
      );
    });

    it('navigates to the bio editor with an empty value', () => {
      const { getByTestId } = renderWithProvider(<ManageProfile />);

      fireEvent.press(getByTestId(ManageProfileSelectorsIDs.BIO_ROW));

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.SOCIAL_PROFILE.MANAGE_PROFILE_FIELD,
        {
          field: ManageProfileFieldName.Bio,
          initialValue: '',
        },
      );
    });

    it('navigates to the trading activity editor with the switch off', () => {
      const { getByTestId } = renderWithProvider(<ManageProfile />);

      fireEvent.press(
        getByTestId(ManageProfileSelectorsIDs.TRADING_ACTIVITY_ROW),
      );

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.SOCIAL_PROFILE.MANAGE_PROFILE_FIELD,
        {
          field: ManageProfileFieldName.TradingActivity,
          initialValue: false,
        },
      );
    });

    it('writes a returned display name onto the row', () => {
      mockRouteParams = {
        fieldUpdate: {
          field: ManageProfileFieldName.DisplayName,
          value: 'Tomato Farmer',
        },
      };

      const { getByTestId } = renderWithProvider(<ManageProfile />);

      expect(
        within(
          getByTestId(ManageProfileSelectorsIDs.DISPLAY_NAME_ROW),
        ).getByText('Tomato Farmer'),
      ).toBeOnTheScreen();
      expect(mockSetParams).toHaveBeenCalledWith({ fieldUpdate: undefined });
    });

    it('writes a returned bio onto the row', () => {
      mockRouteParams = {
        fieldUpdate: {
          field: ManageProfileFieldName.Bio,
          value: 'Just here for the yield.',
        },
      };

      const { getByTestId } = renderWithProvider(<ManageProfile />);

      expect(
        within(getByTestId(ManageProfileSelectorsIDs.BIO_ROW)).getByText(
          'Just here for the yield.',
        ),
      ).toBeOnTheScreen();
    });

    it('writes a returned trading activity toggle onto the row', () => {
      mockRouteParams = {
        fieldUpdate: {
          field: ManageProfileFieldName.TradingActivity,
          value: true,
        },
      };

      const { getByTestId } = renderWithProvider(<ManageProfile />);

      expect(
        within(
          getByTestId(ManageProfileSelectorsIDs.TRADING_ACTIVITY_ROW),
        ).getByText(strings('app_settings.manage_profile.on')),
      ).toBeOnTheScreen();
    });

    it('reopens the display name editor with the value just applied', () => {
      mockRouteParams = {
        fieldUpdate: {
          field: ManageProfileFieldName.DisplayName,
          value: 'Tomato Farmer',
        },
      };
      const { getByTestId } = renderWithProvider(<ManageProfile />);

      fireEvent.press(getByTestId(ManageProfileSelectorsIDs.DISPLAY_NAME_ROW));

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.SOCIAL_PROFILE.MANAGE_PROFILE_FIELD,
        {
          field: ManageProfileFieldName.DisplayName,
          initialValue: 'Tomato Farmer',
        },
      );
    });
  });
});
