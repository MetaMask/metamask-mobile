import React from 'react';
import { fireEvent, within } from '@testing-library/react-native';

import ManageProfileXAccount from './ManageProfileXAccount';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { CommonSelectorsIDs } from '../../../../util/Common.testIds';
import { strings } from '../../../../../locales/i18n';
import { ManageProfileSelectorsIDs } from './ManageProfile.testIds';

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      goBack: mockGoBack,
    }),
  };
});

describe('ManageProfileXAccount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders an empty screen titled X account', () => {
    const { getByTestId, queryByTestId } = renderWithProvider(
      <ManageProfileXAccount />,
    );

    expect(
      getByTestId(ManageProfileSelectorsIDs.X_ACCOUNT_SCREEN),
    ).toBeOnTheScreen();
    expect(
      within(getByTestId(ManageProfileSelectorsIDs.X_ACCOUNT_HEADER)).getByText(
        strings('manage_profile.x_account'),
      ),
    ).toBeOnTheScreen();
    expect(queryByTestId(ManageProfileSelectorsIDs.FIELD_INPUT)).toBeNull();
  });

  it('navigates back when the back button is pressed', () => {
    const { getByTestId } = renderWithProvider(<ManageProfileXAccount />);

    fireEvent.press(getByTestId(CommonSelectorsIDs.BACK_ARROW_BUTTON));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
