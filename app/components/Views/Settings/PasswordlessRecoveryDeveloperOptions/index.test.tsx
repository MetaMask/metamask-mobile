import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import PasswordlessRecoveryDeveloperOptions from './index';

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: mockGoBack }),
}));

jest.mock('react-native-safe-area-context', () => {
  const ReactNative = jest.requireActual('react-native');
  return {
    SafeAreaView: ({ children, ...props }: { children: React.ReactNode }) => (
      <ReactNative.View {...props}>{children}</ReactNative.View>
    ),
  };
});

jest.mock(
  '../../../../component-library/components-temp/HeaderStandardGlass',
  () => {
    const ReactNative = jest.requireActual('react-native');
    return ({ title, onBack }: { title: string; onBack: () => void }) => (
      <ReactNative.View>
        <ReactNative.Text>{title}</ReactNative.Text>
        <ReactNative.Pressable
          testID="passwordless-recovery-back"
          onPress={onBack}
        />
      </ReactNative.View>
    );
  },
);

jest.mock(
  '../DeveloperOptions/PasswordlessRecoveryDeveloperOptionsSection',
  () => {
    const ReactNative = jest.requireActual('react-native');
    return () => (
      <ReactNative.View testID="passwordless-recovery-dev-section" />
    );
  },
);

jest.mock('../../../../selectors/featureFlagController/glassHeaders', () => ({
  selectGlassHeadersEnabled: () => false,
}));

describe('PasswordlessRecoveryDeveloperOptions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the section and navigates back', () => {
    const { getByText, getByTestId } = renderWithProvider(
      <PasswordlessRecoveryDeveloperOptions />,
    );

    expect(getByText('Passwordless recovery')).toBeOnTheScreen();
    expect(getByTestId('passwordless-recovery-dev-section')).toBeOnTheScreen();

    fireEvent.press(getByTestId('passwordless-recovery-back'));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
