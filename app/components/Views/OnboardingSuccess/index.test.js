// Third party dependencies.
import React from 'react';

// Internal dependencies.
import OnboardingSuccess, { OnboardingSuccessComponent } from './';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { useNavigation } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { selectProviderConfig } from '../../../selectors/networkController';
import { OnboardingSuccessSelectorIDs } from '../../../../e2e/selectors/Onboarding/OnboardingSuccess.selectors';
import { SET_COMPLETED_ONBOARDING } from '../../../actions/onboarding';
import { fireEvent, waitFor } from '@testing-library/react-native';
import Routes from '../../../constants/navigation/Routes';
import { Linking } from 'react-native';
import AppConstants from '../../../core/AppConstants';

const mockNavigate = jest.fn();

const mockUseRoute = {
  params: {
    backedUpSRP: false,
    noSRP: false,
  },
};

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
      setOptions: jest.fn(),
      goBack: jest.fn(),
      reset: jest.fn(),
      dangerouslyGetParent: () => ({
        pop: jest.fn(),
      }),
    }),
    useRoute: jest.fn(() => mockUseRoute),
  };
});

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
}));

const mockImportAdditionalAccounts = jest.fn(() => Promise.resolve());
jest.mock(
  '../../../util/importAdditionalAccounts',
  () => () => mockImportAdditionalAccounts(),
);

const mockProviderConfig = {
  type: 'mainnet',
  chainId: '1',
};

describe('OnboardingSuccessComponent', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('should render correctly', () => {
    useSelector.mockImplementation((selector) => {
      if (selector === selectProviderConfig) return mockProviderConfig;
    });
    const { toJSON } = renderWithProvider(
      <OnboardingSuccessComponent navigation={useNavigation()} />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('should render correctly when noSRP is true', () => {
    useSelector.mockImplementation((selector) => {
      if (selector === selectProviderConfig) return mockProviderConfig;
    });
    const { toJSON } = renderWithProvider(
      <OnboardingSuccessComponent navigation={useNavigation()} noSRP />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('should render correctly when backedUpSRP is true', () => {
    useSelector.mockImplementation((selector) => {
      if (selector === selectProviderConfig) return mockProviderConfig;
    });
    const { toJSON } = renderWithProvider(
      <OnboardingSuccessComponent navigation={useNavigation()} backedUpSRP />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('imports additional accounts and sets completedOnboarding to true when onDone is called', () => {
    useSelector.mockImplementation((selector) => {
      if (selector === selectProviderConfig) return mockProviderConfig;
    });
    const mockDispatch = jest.fn();
    useDispatch.mockImplementation(() => mockDispatch);

    const { getByTestId } = renderWithProvider(
      <OnboardingSuccessComponent
        navigation={useNavigation()}
        onDone={jest.fn()}
      />,
    );
    const button = getByTestId(OnboardingSuccessSelectorIDs.DONE_BUTTON);
    button.props.onPress();

    waitFor(() => {
      expect(mockImportAdditionalAccounts).toHaveBeenCalled();
      expect(mockDispatch).toHaveBeenCalledWith({
        type: SET_COMPLETED_ONBOARDING,
        completedOnboarding: true,
      });
    });
  });

  it('should navigate to the default settings screen when the manage default settings button is pressed', () => {
    const { getByTestId } = renderWithProvider(
      <OnboardingSuccessComponent
        navigation={useNavigation()}
        onDone={jest.fn()}
      />,
    );
    const button = getByTestId(
      OnboardingSuccessSelectorIDs.MANAGE_DEFAULT_SETTINGS_BUTTON,
    );
    fireEvent.press(button);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.ONBOARDING.SUCCESS_FLOW, {
      screen: Routes.ONBOARDING.DEFAULT_SETTINGS,
    });
  });

  it('should navigate to the learn more screen when the learn more link is pressed', () => {
    const { getByTestId } = renderWithProvider(
      <OnboardingSuccessComponent
        navigation={useNavigation()}
        onDone={jest.fn()}
      />,
    );
    const button = getByTestId(OnboardingSuccessSelectorIDs.LEARN_MORE_LINK_ID);
    fireEvent.press(button);
    expect(Linking.openURL).toHaveBeenCalledWith(AppConstants.URLS.WHAT_IS_SRP);
  });
});

describe('OnboardingSuccess', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('should render correctly according to snapshot with params', () => {
    const { toJSON } = renderWithProvider(<OnboardingSuccess />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('should render correctly according to snapshot with params backedUpSRP true', () => {
    mockUseRoute.params = {
      backedUpSRP: true,
      noSRP: false,
    };
    const { toJSON } = renderWithProvider(<OnboardingSuccess />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('should render correctly according to snapshot with params noSRP true', () => {
    mockUseRoute.params = {
      backedUpSRP: false,
      noSRP: true,
    };
    const { toJSON } = renderWithProvider(<OnboardingSuccess />);
    expect(toJSON()).toMatchSnapshot();
  });
});
