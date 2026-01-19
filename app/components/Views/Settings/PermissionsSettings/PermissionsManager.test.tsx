import React from 'react';
import { NavigationProp } from '@react-navigation/native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import PermissionsManager from './PermissionsManager';
import { strings } from '../../../../../locales/i18n';
import { SDKSelectorsIDs } from '../../../../../e2e/selectors/Settings/SDK.selectors';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { RootParamList } from '../../../../types/navigation';

const mockNavigate = jest.fn();
const mockSetOptions = jest.fn();

const mockNavigation = {
  navigate: mockNavigate,
  setOptions: mockSetOptions,
} as unknown as NavigationProp<RootParamList>;

jest.mock('react-native-safe-area-context', () => {
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  const frame = { width: 0, height: 0, x: 0, y: 0 };
  return {
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
    SafeAreaConsumer: ({
      children,
    }: {
      children: (insets: typeof inset) => React.ReactNode;
    }) => children(inset),
    useSafeAreaInsets: () => inset,
    useSafeAreaFrame: () => frame,
  };
});

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
