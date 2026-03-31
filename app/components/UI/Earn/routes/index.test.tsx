import React from 'react';
import { render } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import { EarnScreenStack, EarnModalStack } from './index';
import Routes from '../../../../constants/navigation/Routes';
import { backgroundState } from '../../../../util/test/initial-root-state';

jest.mock('../../Earn/Views/EarnLendingDepositConfirmationView', () => {
  const MockView = () => {
    const { View, Text } = jest.requireActual('react-native');
    return (
      <View testID="lending-deposit-confirmation">
        <Text>Lending Deposit Confirmation</Text>
      </View>
    );
  };
  MockView.displayName = 'MockEarnLendingDepositConfirmationView';
  return MockView;
});

jest.mock('../Views/EarnLendingWithdrawalConfirmationView', () => {
  const MockView = () => {
    const { View, Text } = jest.requireActual('react-native');
    return (
      <View testID="lending-withdrawal-confirmation">
        <Text>Lending Withdrawal Confirmation</Text>
      </View>
    );
  };
  MockView.displayName = 'MockEarnLendingWithdrawalConfirmationView';
  return MockView;
});

jest.mock('../Views/EarnMusdConversionEducationView', () => {
  const MockView = () => {
    const { View, Text } = jest.requireActual('react-native');
    return (
      <View testID="musd-conversion-education">
        <Text>MUSD Conversion Education</Text>
      </View>
    );
  };
  MockView.displayName = 'MockEarnMusdConversionEducationView';
  return MockView;
});

jest.mock('../Views/MusdQuickConvertView', () => {
  const MockView = () => {
    const { View, Text } = jest.requireActual('react-native');
    return (
      <View testID="musd-quick-convert">
        <Text>MUSD Quick Convert</Text>
      </View>
    );
  };
  MockView.displayName = 'MockMusdQuickConvertView';
  return MockView;
});

jest.mock('../modals/LendingMaxWithdrawalModal', () => {
  const MockModal = () => {
    const { View, Text } = jest.requireActual('react-native');
    return (
      <View testID="lending-max-withdrawal-modal">
        <Text>Lending Max Withdrawal Modal</Text>
      </View>
    );
  };
  MockModal.displayName = 'MockEarnLendingMaxWithdrawalModal';
  return MockModal;
});

jest.mock('../LendingLearnMoreModal', () => {
  const MockModal = () => {
    const { View, Text } = jest.requireActual('react-native');
    return (
      <View testID="lending-learn-more-modal">
        <Text>Lending Learn More Modal</Text>
      </View>
    );
  };
  MockModal.displayName = 'MockLendingLearnMoreModal';
  return MockModal;
});

jest.mock('../../../Views/confirmations/components/confirm', () => ({
  Confirm: () => {
    const { View, Text } = jest.requireActual('react-native');
    return (
      <View testID="confirm-view">
        <Text>Confirm</Text>
      </View>
    );
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

const mockStore = configureMockStore();
const initialState = {
  engine: {
    backgroundState,
  },
};

const renderWithProviders = (component: React.ReactElement) => {
  const store = mockStore(initialState);
  return render(
    <Provider store={store}>
      <NavigationContainer>{component}</NavigationContainer>
    </Provider>,
  );
};

describe('EarnScreenStack', () => {
  it('renders correctly', () => {
    const { toJSON } = renderWithProviders(<EarnScreenStack />);
    expect(toJSON()).toBeTruthy();
  });

  it('defines lending deposit confirmation route', () => {
    expect(Routes.EARN.LENDING_DEPOSIT_CONFIRMATION).toBeDefined();
  });

  it('defines lending withdrawal confirmation route', () => {
    expect(Routes.EARN.LENDING_WITHDRAWAL_CONFIRMATION).toBeDefined();
  });

  it('defines MUSD conversion education route', () => {
    expect(Routes.EARN.MUSD.CONVERSION_EDUCATION).toBeDefined();
  });

  it('defines MUSD quick convert route', () => {
    expect(Routes.EARN.MUSD.QUICK_CONVERT).toBeDefined();
  });

  it('defines full screen confirmations route', () => {
    expect(
      Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
    ).toBeDefined();
  });
});

describe('EarnModalStack', () => {
  it('renders correctly', () => {
    const { toJSON } = renderWithProviders(<EarnModalStack />);
    expect(toJSON()).toBeTruthy();
  });

  it('defines lending max withdrawal modal route', () => {
    expect(Routes.EARN.MODALS.LENDING_MAX_WITHDRAWAL).toBeDefined();
  });

  it('defines lending learn more modal route', () => {
    expect(Routes.EARN.MODALS.LENDING_LEARN_MORE).toBeDefined();
  });

  it('defines full screen confirmations modal route', () => {
    expect(
      Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
    ).toBeDefined();
  });
});

describe('Route Constants', () => {
  it('has earn root route defined', () => {
    expect(Routes.EARN.ROOT).toBeDefined();
  });

  it('has earn modals root route defined', () => {
    expect(Routes.EARN.MODALS.ROOT).toBeDefined();
  });
});
