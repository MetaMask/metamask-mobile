/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-var-requires */
import React from 'react';
import { render } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { EarnScreenStack, EarnModalStack } from './index';

jest.mock('@react-navigation/stack', () => {
  const { View, Text } = require('react-native');
  return {
    createStackNavigator: () => ({
      Navigator: ({
        children,
        screenOptions,
      }: {
        children: React.ReactNode;
        screenOptions?: {
          headerShown?: boolean;
          presentation?: string;
        };
      }) => (
        <View testID="stack-navigator">
          {screenOptions?.headerShown === false && (
            <Text>headerShown: false</Text>
          )}
          {screenOptions?.presentation && (
            <Text>presentation: {screenOptions.presentation}</Text>
          )}
          {children}
        </View>
      ),
      Screen: ({
        name,
        options,
      }: {
        name: string;
        options?: {
          headerShown?: boolean;
        };
      }) => (
        <View testID={`screen-${name}`}>
          <Text>{name}</Text>
          {options?.headerShown === false && <Text>no-header</Text>}
        </View>
      ),
    }),
  };
});

jest.mock('../../Earn/Views/EarnLendingDepositConfirmationView', () => {
  const { View } = require('react-native');
  return () => <View testID="earn-lending-deposit-confirmation" />;
});

jest.mock('../Views/EarnLendingWithdrawalConfirmationView', () => {
  const { View } = require('react-native');
  return () => <View testID="earn-lending-withdrawal-confirmation" />;
});

jest.mock('../Views/EarnMusdConversionEducationView', () => {
  const { View } = require('react-native');
  return () => <View testID="earn-musd-conversion-education" />;
});

jest.mock('../Views/MusdQuickConvertView', () => {
  const { View } = require('react-native');
  return () => <View testID="musd-quick-convert" />;
});

jest.mock('../modals/LendingMaxWithdrawalModal', () => {
  const { View } = require('react-native');
  return () => <View testID="lending-max-withdrawal-modal" />;
});

jest.mock('../LendingLearnMoreModal', () => {
  const { View } = require('react-native');
  return () => <View testID="lending-learn-more-modal" />;
});

jest.mock('../../../Views/confirmations/components/confirm', () => ({
  Confirm: () => {
    const { View } = require('react-native');
    return <View testID="confirm-component" />;
  },
}));

jest.mock(
  '../../../Views/confirmations/hooks/ui/useEmptyNavHeaderForConfirmations',
  () => ({
    useEmptyNavHeaderForConfirmations: () => ({
      headerShown: false,
    }),
  }),
);

jest.mock('../../../../constants/navigation/Routes', () => ({
  EARN: {
    LENDING_DEPOSIT_CONFIRMATION: 'LendingDepositConfirmation',
    LENDING_WITHDRAWAL_CONFIRMATION: 'LendingWithdrawalConfirmation',
    MUSD: {
      CONVERSION_EDUCATION: 'MusdConversionEducation',
      QUICK_CONVERT: 'MusdQuickConvert',
    },
    MODALS: {
      LENDING_MAX_WITHDRAWAL: 'LendingMaxWithdrawalModal',
      LENDING_LEARN_MORE: 'LendingLearnMoreModal',
    },
  },
  FULL_SCREEN_CONFIRMATIONS: {
    REDESIGNED_CONFIRMATIONS: 'RedesignedConfirmations',
  },
}));

describe('EarnRoutes', () => {
  const renderWithNavigation = (component: React.ReactElement) =>
    render(<NavigationContainer>{component}</NavigationContainer>);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('EarnScreenStack', () => {
    it('renders successfully', () => {
      const { getByTestId } = renderWithNavigation(<EarnScreenStack />);

      expect(getByTestId('stack-navigator')).toBeTruthy();
    });

    it('includes LendingDepositConfirmation screen', () => {
      const { getByTestId } = renderWithNavigation(<EarnScreenStack />);

      expect(getByTestId('screen-LendingDepositConfirmation')).toBeTruthy();
    });

    it('includes LendingWithdrawalConfirmation screen', () => {
      const { getByTestId } = renderWithNavigation(<EarnScreenStack />);

      expect(getByTestId('screen-LendingWithdrawalConfirmation')).toBeTruthy();
    });

    it('includes RedesignedConfirmations screen', () => {
      const { getByTestId } = renderWithNavigation(<EarnScreenStack />);

      expect(getByTestId('screen-RedesignedConfirmations')).toBeTruthy();
    });

    it('includes MusdConversionEducation screen', () => {
      const { getByTestId } = renderWithNavigation(<EarnScreenStack />);

      expect(getByTestId('screen-MusdConversionEducation')).toBeTruthy();
    });

    it('includes MusdQuickConvert screen', () => {
      const { getByTestId } = renderWithNavigation(<EarnScreenStack />);

      expect(getByTestId('screen-MusdQuickConvert')).toBeTruthy();
    });
  });

  describe('EarnModalStack', () => {
    it('renders successfully', () => {
      const { getByTestId } = renderWithNavigation(<EarnModalStack />);

      expect(getByTestId('stack-navigator')).toBeTruthy();
    });

    it('renders with modal presentation', () => {
      const { getByText } = renderWithNavigation(<EarnModalStack />);

      expect(getByText('presentation: modal')).toBeTruthy();
    });

    it('includes LendingMaxWithdrawalModal screen', () => {
      const { getByTestId } = renderWithNavigation(<EarnModalStack />);

      expect(getByTestId('screen-LendingMaxWithdrawalModal')).toBeTruthy();
    });

    it('includes LendingLearnMoreModal screen', () => {
      const { getByTestId } = renderWithNavigation(<EarnModalStack />);

      expect(getByTestId('screen-LendingLearnMoreModal')).toBeTruthy();
    });

    it('includes RedesignedConfirmations modal screen', () => {
      const { getByTestId } = renderWithNavigation(<EarnModalStack />);

      expect(getByTestId('screen-RedesignedConfirmations')).toBeTruthy();
    });

    it('has header hidden for all screens', () => {
      const { getByText } = renderWithNavigation(<EarnModalStack />);

      expect(getByText('headerShown: false')).toBeTruthy();
    });
  });
});
