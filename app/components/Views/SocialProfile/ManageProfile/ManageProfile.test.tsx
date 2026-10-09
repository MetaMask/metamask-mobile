import React from 'react';
import { Dimensions, StyleSheet } from 'react-native';
import { fireEvent, within } from '@testing-library/react-native';

import ManageProfile from './ManageProfile';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { CommonSelectorsIDs } from '../../../../util/Common.testIds';
import { ManageProfileSelectorsIDs } from './ManageProfile.testIds';

import { DEFAULT_PROFILE_AVATAR_SIZE } from './ProfileAvatar';
import { strings } from '../../../../../locales/i18n';

/** Mirrors `VALUE_MAX_WIDTH_RATIO` in ProfileRow. */
const EXPECTED_VALUE_WIDTH_RATIO = 0.45;

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  goBack: mockGoBack,
};

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => mockNavigation,
  };
});

describe('ManageProfile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
      within(header).getByText(strings('manage_profile.header')),
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

    expect(getByText(strings('manage_profile.about'))).toBeOnTheScreen();
    expect(getByText(strings('manage_profile.privacy'))).toBeOnTheScreen();
  });

  it.each([
    [ManageProfileSelectorsIDs.DISPLAY_NAME_ROW, 'manage_profile.display_name'],
    [ManageProfileSelectorsIDs.HANDLE_ROW, 'manage_profile.handle'],
    [ManageProfileSelectorsIDs.BIO_ROW, 'manage_profile.bio'],
    [ManageProfileSelectorsIDs.X_ACCOUNT_ROW, 'manage_profile.x_account'],
    [
      ManageProfileSelectorsIDs.TRADING_ACTIVITY_ROW,
      'manage_profile.trading_activity',
    ],
    [
      ManageProfileSelectorsIDs.LINKED_SOCIAL_ACCOUNT_ROW,
      'manage_profile.linked_social_account',
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
          strings('manage_profile.not_set'),
        ),
      ).toBeOnTheScreen();
    });

    it('reports no linked social account', () => {
      const { getByTestId } = renderWithProvider(<ManageProfile />);

      expect(
        within(
          getByTestId(ManageProfileSelectorsIDs.LINKED_SOCIAL_ACCOUNT_ROW),
        ).getByText(strings('manage_profile.no_linked_account')),
      ).toBeOnTheScreen();
    });

    it('still renders the trading activity state, which is never unset', () => {
      const { getByTestId } = renderWithProvider(<ManageProfile />);

      expect(
        within(
          getByTestId(ManageProfileSelectorsIDs.TRADING_ACTIVITY_ROW),
        ).getByText(strings('manage_profile.off')),
      ).toBeOnTheScreen();
    });

    it('falls back to a generic avatar label when there is no display name', () => {
      const { getByTestId } = renderWithProvider(<ManageProfile />);

      expect(
        getByTestId(ManageProfileSelectorsIDs.AVATAR).props.accessibilityLabel,
      ).toBe(strings('manage_profile.avatar_accessibility_label'));
    });
  });

  it('caps the bio value width so it truncates to a single line on the right', () => {
    const { getByTestId } = renderWithProvider(<ManageProfile />);

    const bioValue = within(
      getByTestId(ManageProfileSelectorsIDs.BIO_ROW),
    ).getByText(strings('manage_profile.not_set'));

    expect(bioValue.props.numberOfLines).toBe(1);
    expect(bioValue).toHaveStyle({ maxWidth: 120 });
  });

  it('bounds a row value so it cannot overflow its row', () => {
    const { getByTestId } = renderWithProvider(<ManageProfile />);

    const valueText = within(
      getByTestId(ManageProfileSelectorsIDs.DISPLAY_NAME_ROW),
    ).getByText(strings('manage_profile.not_set'));

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
    ).getByText(strings('manage_profile.display_name'));

    expect(label.props.numberOfLines).toBe(1);
  });

  it('does not navigate when the screen opens', () => {
    renderWithProvider(<ManageProfile />);

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it.each([
    [ManageProfileSelectorsIDs.DISPLAY_NAME_ROW],
    [ManageProfileSelectorsIDs.HANDLE_ROW],
    [ManageProfileSelectorsIDs.BIO_ROW],
    [ManageProfileSelectorsIDs.X_ACCOUNT_ROW],
    [ManageProfileSelectorsIDs.TRADING_ACTIVITY_ROW],
    [ManageProfileSelectorsIDs.LINKED_SOCIAL_ACCOUNT_ROW],
  ])('renders the %s row as read-only', (testID) => {
    const { getByTestId } = renderWithProvider(<ManageProfile />);

    expect(getByTestId(testID).props.accessibilityRole).toBeUndefined();
  });
});
