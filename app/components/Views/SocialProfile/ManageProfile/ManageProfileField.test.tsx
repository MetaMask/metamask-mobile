import React from 'react';
import { StyleSheet } from 'react-native';
import { CommonActions } from '@react-navigation/native';
import { fireEvent, within } from '@testing-library/react-native';

import ManageProfileField from './ManageProfileField';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { CommonSelectorsIDs } from '../../../../util/Common.testIds';
import Routes from '../../../../constants/navigation/Routes';
import { strings } from '../../../../../locales/i18n';
import { PROFILE_FIELD_MAX_LENGTH } from './ManageProfile.constants';
import { ManageProfileSelectorsIDs } from './ManageProfile.testIds';
import {
  ManageProfileFieldName,
  type ManageProfileFieldParams,
} from './ManageProfileField.types';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockDispatch = jest.fn();
const mockGetState = jest.fn(() => ({
  index: 1,
  routes: [
    { key: 'manage-profile', name: Routes.SOCIAL_PROFILE.MANAGE_PROFILE },
    {
      key: 'manage-profile-field',
      name: Routes.SOCIAL_PROFILE.MANAGE_PROFILE_FIELD,
    },
  ],
}));
const mockNavigation = {
  navigate: mockNavigate,
  goBack: mockGoBack,
  dispatch: mockDispatch,
  getState: mockGetState,
};

let mockFieldParams: ManageProfileFieldParams = {
  field: ManageProfileFieldName.DisplayName,
  initialValue: '',
};

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => mockNavigation,
    useRoute: () => ({ params: mockFieldParams }),
  };
});

const renderField = (params: ManageProfileFieldParams) => {
  mockFieldParams = params;
  return renderWithProvider(<ManageProfileField />);
};

describe('ManageProfileField', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFieldParams = {
      field: ManageProfileFieldName.DisplayName,
      initialValue: '',
    };
  });

  describe('display name', () => {
    it('opens an empty text field when the name is unset', () => {
      const { getByTestId } = renderField({
        field: ManageProfileFieldName.DisplayName,
        initialValue: '',
      });

      expect(
        getByTestId(ManageProfileSelectorsIDs.FIELD_SCREEN),
      ).toBeOnTheScreen();
      expect(
        within(getByTestId(ManageProfileSelectorsIDs.FIELD_HEADER)).getByText(
          strings('manage_profile.display_name'),
        ),
      ).toBeOnTheScreen();
      expect(
        getByTestId(ManageProfileSelectorsIDs.FIELD_INPUT).props.value,
      ).toBe('');
    });

    it('seeds the field with the value passed from Manage profile', () => {
      const { getByTestId } = renderField({
        field: ManageProfileFieldName.DisplayName,
        initialValue: 'Tomato Farmer',
      });

      expect(
        getByTestId(ManageProfileSelectorsIDs.FIELD_INPUT).props.value,
      ).toBe('Tomato Farmer');
    });

    it('returns the edited value to Manage profile on save', () => {
      const { getByTestId } = renderField({
        field: ManageProfileFieldName.DisplayName,
        initialValue: '',
      });

      fireEvent.changeText(
        getByTestId(ManageProfileSelectorsIDs.FIELD_INPUT),
        'Tomato Farmer',
      );
      fireEvent.press(getByTestId(ManageProfileSelectorsIDs.FIELD_SAVE));

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.SOCIAL_PROFILE.MANAGE_PROFILE,
        {
          fieldUpdate: {
            field: ManageProfileFieldName.DisplayName,
            value: 'Tomato Farmer',
          },
        },
        { pop: true },
      );
    });

    it('discards the edit when back is pressed', () => {
      const { getByTestId } = renderField({
        field: ManageProfileFieldName.DisplayName,
        initialValue: '',
      });

      fireEvent.changeText(
        getByTestId(ManageProfileSelectorsIDs.FIELD_INPUT),
        'Discarded',
      );
      fireEvent.press(getByTestId(CommonSelectorsIDs.BACK_ARROW_BUTTON));

      expect(mockGoBack).toHaveBeenCalledTimes(1);
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('caps how many characters the field accepts', () => {
      const { getByTestId } = renderField({
        field: ManageProfileFieldName.DisplayName,
        initialValue: '',
      });

      expect(
        getByTestId(ManageProfileSelectorsIDs.FIELD_INPUT).props.maxLength,
      ).toBe(PROFILE_FIELD_MAX_LENGTH.displayName);
    });
  });

  describe('bio', () => {
    it('opens an empty multiline field when the bio is unset', () => {
      const { getByTestId } = renderField({
        field: ManageProfileFieldName.Bio,
        initialValue: '',
      });

      const input = getByTestId(ManageProfileSelectorsIDs.FIELD_INPUT);

      expect(input.props.value).toBe('');
      expect(input.props.multiline).toBe(true);
      expect(input.props.placeholder).toBe(
        strings('manage_profile.bio_placeholder'),
      );
      expect(input.props.maxLength).toBe(PROFILE_FIELD_MAX_LENGTH.bio);
    });

    it('shows the profile footnote and a zero character count', () => {
      const { getByTestId } = renderField({
        field: ManageProfileFieldName.Bio,
        initialValue: '',
      });

      expect(
        getByTestId(ManageProfileSelectorsIDs.BIO_HELPER),
      ).toHaveTextContent(strings('manage_profile.bio_helper'));
      expect(
        getByTestId(ManageProfileSelectorsIDs.BIO_CHARACTER_COUNT),
      ).toHaveTextContent(
        strings('manage_profile.bio_character_count', {
          count: 0,
          limit: PROFILE_FIELD_MAX_LENGTH.bio,
        }),
      );
    });

    it('updates the character count as the bio is written', () => {
      const { getByTestId } = renderField({
        field: ManageProfileFieldName.Bio,
        initialValue: '',
      });
      const bio = 'Momentum, then out.';

      fireEvent.changeText(
        getByTestId(ManageProfileSelectorsIDs.FIELD_INPUT),
        bio,
      );

      expect(
        getByTestId(ManageProfileSelectorsIDs.BIO_CHARACTER_COUNT),
      ).toHaveTextContent(
        strings('manage_profile.bio_character_count', {
          count: bio.length,
          limit: PROFILE_FIELD_MAX_LENGTH.bio,
        }),
      );
    });

    it('stops the bio at 160 characters', () => {
      const { getByTestId } = renderField({
        field: ManageProfileFieldName.Bio,
        initialValue: '',
      });
      const overLimit = 'a'.repeat(PROFILE_FIELD_MAX_LENGTH.bio + 1);

      fireEvent.changeText(
        getByTestId(ManageProfileSelectorsIDs.FIELD_INPUT),
        overLimit,
      );

      expect(
        getByTestId(ManageProfileSelectorsIDs.FIELD_INPUT).props.value,
      ).toHaveLength(PROFILE_FIELD_MAX_LENGTH.bio);
      expect(
        getByTestId(ManageProfileSelectorsIDs.BIO_CHARACTER_COUNT),
      ).toHaveTextContent(
        strings('manage_profile.bio_character_count', {
          count: PROFILE_FIELD_MAX_LENGTH.bio,
          limit: PROFILE_FIELD_MAX_LENGTH.bio,
        }),
      );
    });

    it('returns the edited bio to Manage profile on save', () => {
      const { getByTestId } = renderField({
        field: ManageProfileFieldName.Bio,
        initialValue: '',
      });

      fireEvent.changeText(
        getByTestId(ManageProfileSelectorsIDs.FIELD_INPUT),
        'Just here for the yield.',
      );
      fireEvent.press(getByTestId(ManageProfileSelectorsIDs.FIELD_SAVE));

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.SOCIAL_PROFILE.MANAGE_PROFILE,
        {
          fieldUpdate: {
            field: ManageProfileFieldName.Bio,
            value: 'Just here for the yield.',
          },
        },
        { pop: true },
      );
    });
  });

  describe('trading activity', () => {
    it('opens a switch reflecting the current setting', () => {
      const { getByTestId } = renderField({
        field: ManageProfileFieldName.TradingActivity,
        initialValue: false,
      });

      const control = within(
        getByTestId(ManageProfileSelectorsIDs.FIELD_SWITCH),
      ).getByRole('switch');

      expect(control.props.value).toBe(false);
    });

    it('renders the privacy card copy and info affordance', () => {
      const { getByTestId } = renderField({
        field: ManageProfileFieldName.TradingActivity,
        initialValue: false,
      });

      expect(
        getByTestId(ManageProfileSelectorsIDs.TOGGLE_DESCRIPTION),
      ).toHaveTextContent(
        strings('manage_profile.trading_activity_private'),
      );
      expect(
        getByTestId(ManageProfileSelectorsIDs.TOGGLE_HELPER_TEXT),
      ).toHaveTextContent(
        strings('manage_profile.trading_activity_footnote'),
      );
      expect(
        getByTestId(ManageProfileSelectorsIDs.TOGGLE_INFO_BUTTON),
      ).toBeOnTheScreen();
      expect(
        StyleSheet.flatten(
          getByTestId(ManageProfileSelectorsIDs.TOGGLE_HELPER_TEXT).props.style,
        )?.fontSize,
      ).toBeLessThan(
        StyleSheet.flatten(
          getByTestId(ManageProfileSelectorsIDs.TOGGLE_DESCRIPTION).props.style,
        )?.fontSize,
      );
    });

    it('opens an explanation when the info icon is pressed', () => {
      const { getByTestId, queryByTestId } = renderField({
        field: ManageProfileFieldName.TradingActivity,
        initialValue: false,
      });

      expect(
        queryByTestId(ManageProfileSelectorsIDs.TRADING_ACTIVITY_INFO_SHEET),
      ).toBeNull();

      fireEvent.press(
        getByTestId(ManageProfileSelectorsIDs.TOGGLE_INFO_BUTTON),
      );

      const sheet = getByTestId(
        ManageProfileSelectorsIDs.TRADING_ACTIVITY_INFO_SHEET,
      );

      expect(
        within(sheet).getByText(
          strings('manage_profile.show_trading_activity'),
        ),
      ).toBeOnTheScreen();
      expect(
        within(sheet).getByText(
          strings(
            'manage_profile.trading_activity_info_description',
          ),
        ),
      ).toBeOnTheScreen();
    });

    it('swaps the description and commits when toggled on', () => {
      const { getByTestId } = renderField({
        field: ManageProfileFieldName.TradingActivity,
        initialValue: false,
      });

      fireEvent(
        getByTestId(ManageProfileSelectorsIDs.FIELD_SWITCH),
        'valueChange',
        true,
      );

      expect(
        getByTestId(ManageProfileSelectorsIDs.TOGGLE_DESCRIPTION),
      ).toHaveTextContent(
        strings('manage_profile.trading_activity_public'),
      );
      expect(mockDispatch).toHaveBeenCalledWith({
        ...CommonActions.setParams({
          fieldUpdate: {
            field: ManageProfileFieldName.TradingActivity,
            value: true,
          },
        }),
        source: 'manage-profile',
      });
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('offers no save button, since changes apply immediately', () => {
      const { queryByTestId } = renderField({
        field: ManageProfileFieldName.TradingActivity,
        initialValue: false,
      });

      expect(queryByTestId(ManageProfileSelectorsIDs.FIELD_SAVE)).toBeNull();
    });

    it('goes back without saving again when the switch screen is closed', () => {
      const { getByTestId } = renderField({
        field: ManageProfileFieldName.TradingActivity,
        initialValue: false,
      });

      fireEvent.press(getByTestId(CommonSelectorsIDs.BACK_ARROW_BUTTON));

      expect(mockGoBack).toHaveBeenCalledTimes(1);
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});
