import React from 'react';
import { screen } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import TermsAndConditions from './';
import { strings } from '../../../../locales/i18n';

describe('TermsAndConditions', () => {
  it('should render correctly', () => {
    renderWithProvider(<TermsAndConditions action="import" />);
    expect(
      screen.getByText(strings('terms_and_conditions.title')),
    ).toBeOnTheScreen();
  });
});
