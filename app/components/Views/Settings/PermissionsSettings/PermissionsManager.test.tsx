import React from 'react';
import { NavigationProp } from '@react-navigation/native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import PermissionsManager from './PermissionsManager';
import { strings } from '../../../../../locales/i18n';
import { SDKSelectorsIDs } from '../../SDK/SDK.testIds';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { backgroundState } from '../../../../util/test/initial-root-state';

const mockNavigate = jest.fn();
const mockSetOptions = jest.fn();

const mockNavigation = {
  navigate: mockNavigate,
  setOptions: mockSetOptions,
} as unknown as NavigationProp<{
  [key: string]: object | undefined;
}>;

describe('PermissionsManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render empty state when no permissions exist', () => {
    const { getByText, getByTestId } = renderWithProvider(
      <SafeAreaProvider>
        <PermissionsManager navigation={mockNavigation} />
      </SafeAreaProvider>,
      {
        state: {
          engine: {
            backgroundState,
          },
        },
      },
    );

    expect(
      getByTestId(SDKSelectorsIDs.SESSION_MANAGER_CONTAINER),
    ).toBeDefined();
    expect(getByText(strings('app_settings.no_permissions'))).toBeDefined();
    expect(
      getByText(strings('app_settings.no_permissions_desc')),
    ).toBeDefined();
  });
});
