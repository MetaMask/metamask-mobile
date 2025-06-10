import React from 'react';
import SkipAccountSecurityModal from './';
import { strings } from '../../../../locales/i18n';
import { useNavigation } from '@react-navigation/native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { fireEvent } from '@testing-library/react-native';
import { SkipAccountSecurityModalSelectorsIDs } from '../../../../e2e/selectors/Onboarding/SkipAccountSecurityModal.selectors';
import { Platform } from 'react-native';

const mockOnConfirm = jest.fn();
const mockOnCancel = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: jest.fn(),
    useFocusEffect: jest.fn(),
  };
});

jest.mock('react-native', () => {
  const originalModule = jest.requireActual('react-native');
  return {
    ...originalModule,
    Platform: {
      ...originalModule.Platform,
      OS: 'ios', // Mock Platform.OS as 'ios'
    },
  };
});

jest.mock(
  '../../../component-library/components/BottomSheets/BottomSheet',
  () => ({
    __esModule: true,
    default: jest.fn(({ children }, ref) => {
      const onCloseBottomSheet = jest.fn();
      if (ref && typeof ref === 'function') {
        ref({ onCloseBottomSheet });
      }
      return <div data-testid="mock-bottom-sheet">{children}</div>;
    }),
  }),
);

describe('SkipAccountSecurityModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const setupTest = () => {
    const mockNavigate = jest.fn();
    const mockGoBack = jest.fn();
    const mockSetOptions = jest.fn();

    (useNavigation as jest.Mock).mockReturnValue({
      navigate: mockNavigate,
      goBack: mockGoBack,
      setOptions: mockSetOptions,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      isFocused: jest.fn(),
      reset: jest.fn(),
    });

    const wrapper = renderWithProvider(
      <SkipAccountSecurityModal
        route={{
          params: {
            onConfirm: mockOnConfirm,
            onCancel: mockOnCancel,
          },
        }}
      />,
    );

    return {
      wrapper,
      mockNavigate,
      mockGoBack,
      mockSetOptions,
    };
  };

  const setupTestWithoutParams = () => {
    const mockNavigate = jest.fn();
    const mockGoBack = jest.fn();
    const mockSetOptions = jest.fn();

    (useNavigation as jest.Mock).mockReturnValue({
      navigate: mockNavigate,
      goBack: mockGoBack,
      setOptions: mockSetOptions,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      isFocused: jest.fn(),
      reset: jest.fn(),
    });

    const wrapper = renderWithProvider(<SkipAccountSecurityModal route={{}} />);

    return {
      wrapper,
      mockNavigate,
      mockGoBack,
      mockSetOptions,
    };
  };

  it('should render correctly', () => {
    const { wrapper } = setupTest();
    expect(wrapper).toMatchSnapshot();
  });

  it('should render cta actions', () => {
    const { wrapper } = setupTest();

    const cancelButton = wrapper.getByRole('button', {
      name: strings('account_backup_step_1.skip_button_cancel'),
    });
    const confirmButton = wrapper.getByRole('button', {
      name: strings('account_backup_step_1.skip_button_confirm'),
    });

    expect(cancelButton).toBeTruthy();
    expect(confirmButton).toBeTruthy();
  });

  it('should render cta actions without params', () => {
    const { wrapper } = setupTestWithoutParams();

    const cancelButton = wrapper.getByRole('button', {
      name: strings('account_backup_step_1.skip_button_cancel'),
    });
    const confirmButton = wrapper.getByRole('button', {
      name: strings('account_backup_step_1.skip_button_confirm'),
    });

    expect(cancelButton).toBeTruthy();
    expect(confirmButton).toBeTruthy();
  });

  it('should render cta actions and actions are called', () => {
    Platform.OS = 'android';

    const { wrapper, mockGoBack } = setupTest();

    const cancelButton = wrapper.getByRole('button', {
      name: strings('account_backup_step_1.skip_button_cancel'),
    });
    const confirmButton = wrapper.getByRole('button', {
      name: strings('account_backup_step_1.skip_button_confirm'),
    });
    const checkbox = wrapper.getByTestId(
      SkipAccountSecurityModalSelectorsIDs.iOS_SKIP_BACKUP_BUTTON_ID,
    );

    expect(cancelButton).toBeEnabled();
    expect(confirmButton.props.disabled).toBe(true);
    expect(checkbox.props.disabled).toBe(false);

    fireEvent.press(checkbox);
    expect(confirmButton.props.disabled).toBe(false);

    fireEvent.press(cancelButton);
    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
    expect(mockOnConfirm).toHaveBeenCalledTimes(0);

    fireEvent.press(confirmButton);
    expect(mockGoBack).toHaveBeenCalledTimes(2);
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
  });

  it('should handle onCancel when route params are not provided', () => {
    const { wrapper, mockGoBack } = setupTestWithoutParams();

    const cancelButton = wrapper.getByRole('button', {
      name: strings('account_backup_step_1.skip_button_cancel'),
    });

    fireEvent.press(cancelButton);
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('should handle onConfirm when route params are not provided', () => {
    const { wrapper, mockGoBack } = setupTestWithoutParams();

    const confirmButton = wrapper.getByRole('button', {
      name: strings('account_backup_step_1.skip_button_confirm'),
    });

    fireEvent.press(confirmButton);
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
