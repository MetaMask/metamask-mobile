import React from 'react';
import { StyleSheet } from 'react-native';
import { lightTheme } from '@metamask/design-tokens';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import RewardsTaxFormView from './RewardsTaxFormView';
import { REWARDS_TAX_FORM_VIEW_TEST_IDS } from './RewardsTaxFormView.testIds';

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useRoute: () => ({
      key: 'RewardsTaxFormView',
      name: 'RewardsTaxFormView',
      params: {
        url: 'https://tax-form.test/form',
        profileId: 'profile-a',
      },
    }),
  };
});

jest.mock('../hooks/useTaxDocumentation', () => ({
  useTaxDocumentation: () => ({
    replaceExpiredToken: jest.fn(),
    rerouteFromForm: jest.fn(),
    openPendingReview: jest.fn(),
    closeFormWithError: jest.fn(),
  }),
}));

jest.mock('../../../../selectors/identity', () => ({
  selectSessionProfileId: () => 'profile-a',
}));

describe('RewardsTaxFormView', () => {
  it('insets the close control below the status bar', () => {
    const { getByTestId } = renderWithProvider(<RewardsTaxFormView />);

    const container = getByTestId(REWARDS_TAX_FORM_VIEW_TEST_IDS.CONTAINER);
    expect(container.props.edges).toEqual(['top']);
    expect(StyleSheet.flatten(container.props.style).backgroundColor).toBe(
      lightTheme.colors.background.default,
    );
    expect(getByTestId(REWARDS_TAX_FORM_VIEW_TEST_IDS.CLOSE)).toBeOnTheScreen();
    expect(
      getByTestId(REWARDS_TAX_FORM_VIEW_TEST_IDS.WEBVIEW).props.style,
    ).toEqual({ backgroundColor: lightTheme.colors.background.default });
  });
});
