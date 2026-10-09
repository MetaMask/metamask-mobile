import React from 'react';
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
const mockNavigation = {
  navigate: mockNavigate,
  goBack: mockGoBack,
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
});
