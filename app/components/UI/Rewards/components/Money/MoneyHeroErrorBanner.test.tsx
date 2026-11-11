import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { AppThemeKey } from '../../../../../util/theme/models';
import MoneyHeroErrorBanner from './MoneyHeroErrorBanner';

const renderBanner = (onRetry = jest.fn(), isRetrying = false) =>
  renderWithProvider(
    <MoneyHeroErrorBanner
      onRetry={onRetry}
      isRetrying={isRetrying}
      testID="money-hero-error"
    />,
    { state: { user: { appTheme: AppThemeKey.light } } },
  );

describe('MoneyHeroErrorBanner', () => {
  it('renders the fetch error and retries from the confirm button', () => {
    const onRetry = jest.fn();
    const { getByTestId, getByText } = renderBanner(onRetry);

    expect(getByTestId('money-hero-error')).toBeOnTheScreen();
    expect(
      getByText(strings('rewards.referral_details_error.error_fetching_title')),
    ).toBeOnTheScreen();
    expect(
      getByText(
        strings('rewards.referral_details_error.error_fetching_description'),
      ),
    ).toBeOnTheScreen();

    fireEvent.press(
      getByText(strings('rewards.referral_details_error.retry_button')),
    );

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('passes the retry loading state through to the confirm button', () => {
    const { getByText } = renderBanner(jest.fn(), true);

    expect(
      getByText(strings('rewards.referral_details_error.retry_button')),
    ).toBeOnTheScreen();
  });
});
