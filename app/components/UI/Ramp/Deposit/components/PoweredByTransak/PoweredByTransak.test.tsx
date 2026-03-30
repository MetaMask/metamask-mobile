import React from 'react';
import { render } from '@testing-library/react-native';
import I18n from '../../../../../../../locales/i18n';
import PoweredByTransak from './PoweredByTransak';

describe('PoweredByTransak', () => {
  afterEach(() => {
    I18n.locale = 'en';
    jest.restoreAllMocks();
  });

  it('renders svg logo for english locales', () => {
    I18n.locale = 'en-US';

    const { queryByText } = render(
      <PoweredByTransak name="powered-by-transak-logo" />,
    );

    expect(queryByText('Powered by Transak')).toBeNull();
  });

  it('renders localized text for non-english locales', () => {
    I18n.locale = 'es';

    const { getByText } = render(
      <PoweredByTransak name="powered-by-transak-logo" />,
    );

    expect(getByText('Desarrollado por Transak')).toBeOnTheScreen();
  });
});
