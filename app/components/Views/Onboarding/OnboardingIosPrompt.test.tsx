import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { strings } from '../../../../locales/i18n';
import {
  IconColor,
  IconName,
} from '../../../component-library/components/Icons/Icon';
import type { AppNavigationProp } from '../../../core/NavigationService/types';

jest.mock('../SuccessErrorSheet/utils', () => ({
  navigateToSuccessErrorSheetPromise: jest.fn(() => Promise.resolve()),
}));

import { navigateToSuccessErrorSheetPromise } from '../SuccessErrorSheet/utils';
import {
  IosGoogleLoginVersionWarningDescription,
  presentIosGoogleLoginUnsupportedBlockingSheet,
  presentIosGoogleLoginUnsupportedBlockingSheetRehydration,
  presentIosGoogleLoginVersionWarningSheet,
} from './OnboardingIosPrompt';

const mockNavigateToSheet = jest.mocked(navigateToSuccessErrorSheetPromise);

const mockNavigation = {} as unknown as AppNavigationProp;

describe('IosGoogleLoginVersionWarningDescription', () => {
  it('renders localized iOS update copy', () => {
    const { getByText } = renderWithProvider(
      <IosGoogleLoginVersionWarningDescription />,
    );

    expect(
      getByText(strings('error_sheet.ios_need_update_description_version')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('error_sheet.ios_need_update_description2')),
    ).toBeOnTheScreen();
  });
});

describe('presentIosGoogleLoginUnsupportedBlockingSheet', () => {
  beforeEach(() => {
    mockNavigateToSheet.mockClear();
  });

  it('opens error sheet with blocking title, button, and non-interactable sheet', async () => {
    await presentIosGoogleLoginUnsupportedBlockingSheet(mockNavigation);

    expect(mockNavigateToSheet).toHaveBeenCalledTimes(1);
    expect(mockNavigateToSheet).toHaveBeenCalledWith(
      mockNavigation,
      expect.objectContaining({
        type: 'error',
        title: strings(
          'error_sheet.ios_google_login_unsupported_blocking_title',
        ),
        primaryButtonLabel: strings(
          'error_sheet.ios_google_login_unsupported_blocking_button',
        ),
        closeOnPrimaryButtonPress: true,
        isInteractable: false,
      }),
    );

    const [, params] = mockNavigateToSheet.mock.calls[0];
    expect(React.isValidElement(params.description)).toBe(true);
  });
});

describe('presentIosGoogleLoginUnsupportedBlockingSheetRehydration', () => {
  beforeEach(() => {
    mockNavigateToSheet.mockClear();
  });

  it('opens error sheet with rehydration title, button, and non-interactable sheet', async () => {
    await presentIosGoogleLoginUnsupportedBlockingSheetRehydration(
      mockNavigation,
    );

    expect(mockNavigateToSheet).toHaveBeenCalledTimes(1);
    expect(mockNavigateToSheet).toHaveBeenCalledWith(
      mockNavigation,
      expect.objectContaining({
        type: 'error',
        title: strings(
          'error_sheet.ios_google_login_unsupported_blocking_rehydration_title',
        ),
        primaryButtonLabel: strings(
          'error_sheet.ios_google_login_unsupported_blocking_rehydration_button',
        ),
        closeOnPrimaryButtonPress: true,
        isInteractable: false,
      }),
    );

    const [, params] = mockNavigateToSheet.mock.calls[0];
    expect(React.isValidElement(params.description)).toBe(true);
  });
});

describe('presentIosGoogleLoginVersionWarningSheet', () => {
  beforeEach(() => {
    mockNavigateToSheet.mockClear();
  });

  it('opens warning-styled error sheet with version warning copy', async () => {
    await presentIosGoogleLoginVersionWarningSheet(mockNavigation);

    expect(mockNavigateToSheet).toHaveBeenCalledTimes(1);
    expect(mockNavigateToSheet).toHaveBeenCalledWith(
      mockNavigation,
      expect.objectContaining({
        type: 'error',
        icon: IconName.Warning,
        iconColor: IconColor.Warning,
        title: strings('error_sheet.ios_need_update_title'),
        primaryButtonLabel: strings('error_sheet.ios_need_update_button'),
        closeOnPrimaryButtonPress: true,
        isInteractable: false,
      }),
    );

    const [, params] = mockNavigateToSheet.mock.calls[0];
    expect(React.isValidElement(params.description)).toBe(true);
  });
});
