import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import TermsAndConditions from './';
import { strings } from '../../../../locales/i18n';
import AppConstants from '../../../core/AppConstants';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
import { TermsAndConditionsSelectorsIDs } from './TermsAndConditions.testIds';

describe('TermsAndConditions', () => {
  const navigate = jest.fn();
  const navigation = { navigate } as unknown as AppNavigationProp;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render correctly', () => {
    renderWithProvider(<TermsAndConditions navigation={navigation} />);

    expect(
      screen.getByText(strings('terms_and_conditions.title')),
    ).toBeOnTheScreen();
  });

  it('navigates to the terms and conditions webview when pressed', () => {
    renderWithProvider(<TermsAndConditions navigation={navigation} />);

    fireEvent.press(
      screen.getByTestId(TermsAndConditionsSelectorsIDs.ACCEPT_BUTTON),
    );

    expect(navigate).toHaveBeenCalledWith('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: AppConstants.URLS.TERMS_AND_CONDITIONS,
        title: strings('terms_and_conditions.title'),
      },
    });
  });
});
