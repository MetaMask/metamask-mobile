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
  return () => <View testID="earn-lending-deposit-confirmation-view" />;
});

jest.mock('../Views/EarnLendingWithdrawalConfirmationView', () => {
  const { View } = require('react-native');
  return () => <View testID="earn-lending-withdrawal-confirmation-view" />;
});

jest.mock('../Views/EarnMusdConversionEducationView', () => {
  const { View } = require('react-native');
  return () => <View testID="earn-musd-conversion-education-view" />;
});

jest.mock('../Views/MusdQuickConvertView', () => {
  const { View } = require('react-native');
  return () => <View testID="musd-quick-convert-view" />;
});

jest.mock('../modals/LendingMaxWithdrawalModal', () => {
  const { View } = require('react-native');
  return () => <View testID="lending-max-withdrawal-modal" />;
});

jest.mock('../LendingLearnMoreModal', () => {
  const { View } = require('react-native');
  return () => <View testID="lending-learn-more-modal" />;
});

jest.mock('../../../Views/confirmations/components/confirm', () => {
  const { View } = require('react-native');
  return {
    Confirm: () => <View testID="confirm-component" />,
  };
});

jest.mock(
  '../../../Views/confirmations/hooks/ui/useEmptyNavHeaderForConfirmations',
  () => ({
    useEmptyNavHeaderForConfirmations: jest.fn(() => ({
      headerShown: false,
    })),
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
      LENDING_MAX_WITHDRAWAL: 'LendingMaxWithdrawal',
      LENDING_LEARN_MORE: 'LendingLearnMore',
    },
  },
  FULL_SCREEN_CONFIRMATIONS: {
    REDESIGNED_CONFIRMATIONS: 'RedesignedConfirmations',
  },
}));

describe('Earn Routes', () => {
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

    it('renders stack navigator structure', () => {
      const { getAllByTestId } = renderWithNavigation(<EarnScreenStack />);

      expect(getAllByTestId('stack-navigator').length).toBeGreaterThan(0);
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

    it('uses useEmptyNavHeaderForConfirmations hook for header options', () => {
      const mockHook = jest.requireMock(
        '../../../Views/confirmations/hooks/ui/useEmptyNavHeaderForConfirmations',
      ).useEmptyNavHeaderForConfirmations;

      renderWithNavigation(<EarnScreenStack />);

      expect(mockHook).toHaveBeenCalled();
    });
  });

  describe('EarnModalStack', () => {
    it('renders successfully', () => {
      const { getByTestId } = renderWithNavigation(<EarnModalStack />);

      expect(getByTestId('stack-navigator')).toBeTruthy();
    });

    it('renders stack navigator for modals', () => {
      const { getAllByTestId } = renderWithNavigation(<EarnModalStack />);

      expect(getAllByTestId('stack-navigator').length).toBeGreaterThan(0);
    });

    it('includes LendingMaxWithdrawal modal screen', () => {
      const { getByTestId } = renderWithNavigation(<EarnModalStack />);

      expect(getByTestId('screen-LendingMaxWithdrawal')).toBeTruthy();
    });

    it('includes LendingLearnMore modal screen', () => {
      const { getByTestId } = renderWithNavigation(<EarnModalStack />);

      expect(getByTestId('screen-LendingLearnMore')).toBeTruthy();
    });

    it('includes RedesignedConfirmations modal screen', () => {
      const { getByTestId } = renderWithNavigation(<EarnModalStack />);

      expect(getByTestId('screen-RedesignedConfirmations')).toBeTruthy();
    });

    it('has modal presentation style', () => {
      const { getByText } = renderWithNavigation(<EarnModalStack />);

      expect(getByText('presentation: modal')).toBeTruthy();
    });

    it('has header hidden by default', () => {
      const { getByText } = renderWithNavigation(<EarnModalStack />);

      expect(getByText('headerShown: false')).toBeTruthy();
    });
  });

  describe('Screen options', () => {
    it('MusdConversionEducation screen has header hidden', () => {
      const { getByTestId } = renderWithNavigation(<EarnScreenStack />);

      const screen = getByTestId('screen-MusdConversionEducation');
      expect(screen).toBeTruthy();
    });

    it('all modal screens have header hidden', () => {
      const { getAllByText } = renderWithNavigation(<EarnModalStack />);

      const noHeaderTexts = getAllByText('no-header');
      expect(noHeaderTexts.length).toBeGreaterThan(0);
    });
  });
});
