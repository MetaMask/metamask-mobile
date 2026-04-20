import React from 'react';
import AccountBackupStep1B from './';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { useNavigation } from '@react-navigation/native';
import { strings } from '../../../../locales/i18n';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import AndroidBackHandler from '../AndroidBackHandler';
import Device from '../../../util/device';
import Routes from '../../../constants/navigation/Routes';
import { InteractionManager } from 'react-native';

jest.mock('../../UI/ActionModal', () => {
  const { View } = jest.requireActual('react-native');
  return ({
    children,
    modalVisible,
  }: {
    children: React.ReactNode;
    modalVisible: boolean;
  }) => (
    <View testID="mock-action-modal">{modalVisible ? children : null}</View>
  );
});

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: jest.fn(),
    useFocusEffect: jest.fn(),
  };
});

jest.mock('../../../util/device', () => ({
  isIos: jest.fn(),
  isAndroid: jest.fn(),
  isIphoneX: jest.fn(),
  isIphone5S: jest.fn(),
}));

const mockRunAfterInteractions = jest.fn().mockImplementation((cb) => {
  cb();
  return {
    then: (onfulfilled: () => void) => Promise.resolve(onfulfilled()),
    done: (onfulfilled: () => void, onrejected: () => void) =>
      Promise.resolve().then(onfulfilled, onrejected),
    cancel: jest.fn(),
  };
});
jest
  .spyOn(InteractionManager, 'runAfterInteractions')
  .mockImplementation(mockRunAfterInteractions);

const createMockNavigation = () => ({
  navigate: jest.fn(),
  goBack: jest.fn(),
  setOptions: jest.fn(),
});

const defaultState = {
  engine: {
    backgroundState: {
      SeedlessOnboardingController: {
        vault: undefined as string | undefined,
      },
    },
  },
};

const seedlessState = {
  engine: {
    backgroundState: {
      SeedlessOnboardingController: {
        vault: 'encrypted-vault-data',
      },
    },
  },
};

describe('AccountBackupStep1B', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  const setupTest = (stateOverride = defaultState) => {
    const mockNav = createMockNavigation();

    const mockNavHook = (useNavigation as jest.Mock).mockReturnValue({
      ...mockNav,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      isFocused: jest.fn(),
      reset: jest.fn(),
    });

    const wrapper = renderWithProvider(
      <AccountBackupStep1B navigation={mockNav} route={{}} />,
      { state: stateOverride },
    );

    return { wrapper, mockNav, mockNavHook };
  };

  describe('rendering', () => {
    it('renders title and SRP explanation link', () => {
      const { wrapper } = setupTest();

      const title = wrapper.getByText(strings('account_backup_step_1B.title'));
      const srpLink = wrapper.getByText(
        strings('account_backup_step_1B.subtitle_2'),
      );

      expect(title).toBeOnTheScreen();
      expect(srpLink).toBeOnTheScreen();
    });

    it('renders why-important info button', () => {
      const { wrapper } = setupTest();

      const whyImportantButton = wrapper.getByText(
        strings('account_backup_step_1B.why_important'),
      );

      expect(whyImportantButton).toBeOnTheScreen();
    });

    it('renders start CTA button', () => {
      const { wrapper } = setupTest();

      const ctaButton = wrapper.getByText(
        strings('account_backup_step_1B.cta_text'),
      );

      expect(ctaButton).toBeOnTheScreen();
    });

    it('renders AndroidBackHandler on Android', () => {
      (Device.isAndroid as jest.Mock).mockReturnValue(true);
      const { wrapper } = setupTest();

      const androidBackHandler = wrapper.UNSAFE_getByType(AndroidBackHandler);

      expect(androidBackHandler.props.customBackPress).toBeDefined();
    });

    it('sets navigation header with empty left component', () => {
      const { mockNav } = setupTest();

      expect(mockNav.setOptions).toHaveBeenCalled();
      const headerLeft = mockNav.setOptions.mock.calls[0][0].headerLeft();

      expect(React.isValidElement(headerLeft)).toBe(true);
    });
  });

  describe('navigation', () => {
    it('navigates to SRP modal when explanation link is pressed', () => {
      const { wrapper, mockNav } = setupTest();

      const srpLink = wrapper.getByText(
        strings('account_backup_step_1B.subtitle_2'),
      );
      fireEvent.press(srpLink);

      expect(mockNav.navigate).toHaveBeenCalledWith(
        Routes.MODAL.ROOT_MODAL_FLOW,
        { screen: Routes.SHEET.SEEDPHRASE_MODAL },
      );
    });

    it('navigates to ManualBackupStep1 with settingsBackup when CTA is pressed', () => {
      const { wrapper, mockNav } = setupTest();

      const ctaButton = wrapper.getByText(
        strings('account_backup_step_1B.cta_text'),
      );
      fireEvent.press(ctaButton);

      expect(mockNav.navigate).toHaveBeenCalledWith('ManualBackupStep1', {
        settingsBackup: true,
      });
    });

    it('navigates to webview when learn more is pressed in why-secure modal', async () => {
      const { wrapper, mockNav } = setupTest();

      await act(async () => {
        fireEvent.press(
          wrapper.getByText(strings('account_backup_step_1B.why_important')),
        );
      });

      await waitFor(() => {
        expect(
          wrapper.getByText(strings('account_backup_step_1B.learn_more')),
        ).toBeOnTheScreen();
      });

      await act(async () => {
        fireEvent.press(
          wrapper.getByText(strings('account_backup_step_1B.learn_more')),
        );
      });

      expect(mockNav.navigate).toHaveBeenCalledWith('Webview', {
        screen: 'SimpleWebview',
        params: {
          url: 'https://support.metamask.io/privacy-and-security/basic-safety-and-security-tips-for-metamask/',
          title: strings('drawer.metamask_support'),
        },
      });
    });
  });

  describe('why-secure modal', () => {
    it('reveals modal content when why-important button is pressed', async () => {
      const { wrapper } = setupTest();

      await act(async () => {
        fireEvent.press(
          wrapper.getByText(strings('account_backup_step_1B.why_important')),
        );
      });

      await waitFor(() => {
        expect(
          wrapper.getByText(strings('account_backup_step_1B.why_secure_title')),
        ).toBeOnTheScreen();
      });
    });

    it('keeps modal hidden when seedless onboarding login flow is active', async () => {
      const { wrapper } = setupTest(seedlessState);

      await act(async () => {
        fireEvent.press(
          wrapper.getByText(strings('account_backup_step_1B.why_important')),
        );
      });

      expect(
        wrapper.queryByText(strings('account_backup_step_1B.why_secure_title')),
      ).toBeNull();
    });
  });

  describe('android back handler', () => {
    it('returns null when back press is triggered', () => {
      (Device.isAndroid as jest.Mock).mockReturnValue(true);
      const { wrapper } = setupTest();

      const androidBackHandler = wrapper.UNSAFE_getByType(AndroidBackHandler);
      const result = androidBackHandler.props.customBackPress();

      expect(result).toBeNull();
    });
  });
});
