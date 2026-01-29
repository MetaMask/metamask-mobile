import React from 'react';
import SkipAccountSecurityModal from './';
import { strings } from '../../../../locales/i18n';
import { useNavigation } from '@react-navigation/native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { fireEvent } from '@testing-library/react-native';
import { SkipAccountSecurityModalSelectorsIDs } from './SkipAccountSecurityModal.testIds';
import { Platform } from 'react-native';

const mockOnConfirm = jest.fn();
const mockOnCancel = jest.fn();
const mockUseRoute = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: jest.fn(),
    useRoute: () => mockUseRoute(),
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

  describe('with route params', () => {
    const setupTest = () => {
      const mockNavigate = jest.fn();
      const mockGoBack = jest.fn();
      const mockSetOptions = jest.fn();

      const mockNavigation = (useNavigation as jest.Mock).mockReturnValue({
        navigate: mockNavigate,
        goBack: mockGoBack,
        setOptions: mockSetOptions,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        isFocused: jest.fn(),
        reset: jest.fn(),
      });

      mockUseRoute.mockReturnValue({
        params: {
          onConfirm: mockOnConfirm,
          onCancel: mockOnCancel,
        },
      });

      const wrapper = renderWithProvider(<SkipAccountSecurityModal />);

      return {
        wrapper,
        mockNavigate,
        mockGoBack,
        mockSetOptions,
        mockNavigation,
      };
    };

    it('render matches snapshot', () => {
      const { wrapper, mockNavigation } = setupTest();
      expect(wrapper).toMatchSnapshot();
      mockNavigation.mockRestore();
    });

    it('render Skip and Secure now buttons with correct content', () => {
      const { wrapper, mockNavigation } = setupTest();

      const cancelButton = wrapper.getByRole('button', {
        name: strings('account_backup_step_1.skip_button_cancel'),
      });
      const confirmButton = wrapper.getByRole('button', {
        name: strings('account_backup_step_1.skip_button_confirm'),
      });

      expect(cancelButton).toBeTruthy();
      expect(confirmButton).toBeTruthy();
      mockNavigation.mockRestore();
    });

    it('on skip button press, the bottom sheet is closed and the onConfirm function is called', () => {
      Platform.OS = 'android';

      const { wrapper, mockGoBack, mockNavigation } = setupTest();

      const confirmButton = wrapper.getByRole('button', {
        name: strings('account_backup_step_1.skip_button_confirm'),
      });
      expect(confirmButton.props.disabled).toBe(true);

      const checkbox = wrapper.getByTestId(
        SkipAccountSecurityModalSelectorsIDs.iOS_SKIP_BACKUP_BUTTON_ID,
      );
      fireEvent.press(checkbox);

      expect(confirmButton.props.disabled).toBe(false);

      fireEvent.press(confirmButton);
      expect(mockGoBack).toHaveBeenCalled();
      expect(mockOnConfirm).toHaveBeenCalledTimes(1);
      mockNavigation.mockRestore();
    });

    it('on secure now button press, the bottom sheet is closed and the onCancel function is called', () => {
      Platform.OS = 'android';

      const { wrapper, mockGoBack, mockNavigation } = setupTest();

      const cancelButton = wrapper.getByRole('button', {
        name: strings('account_backup_step_1.skip_button_cancel'),
      });

      expect(cancelButton).toBeEnabled();

      const checkbox = wrapper.getByTestId(
        SkipAccountSecurityModalSelectorsIDs.iOS_SKIP_BACKUP_BUTTON_ID,
      );

      fireEvent.press(checkbox);

      fireEvent.press(cancelButton);
      expect(mockGoBack).toHaveBeenCalled();
      expect(mockOnCancel).toHaveBeenCalledTimes(1);
      mockNavigation.mockRestore();
    });
  });

  describe('with empty route params', () => {
    const setupTest = () => {
      const mockNavigate = jest.fn();
      const mockGoBack = jest.fn();
      const mockSetOptions = jest.fn();

      const mockNavigation = (useNavigation as jest.Mock).mockReturnValue({
        navigate: mockNavigate,
        goBack: mockGoBack,
        setOptions: mockSetOptions,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        isFocused: jest.fn(),
        reset: jest.fn(),
      });

      mockUseRoute.mockReturnValue({
        params: {},
      });

      const wrapper = renderWithProvider(<SkipAccountSecurityModal />);

      return {
        wrapper,
        mockNavigate,
        mockGoBack,
        mockSetOptions,
        mockNavigation,
      };
    };

    it('render matches snapshot', () => {
      const { wrapper, mockNavigation } = setupTest();
      expect(wrapper).toMatchSnapshot();
      mockNavigation.mockRestore();
    });

    it('on secure now button press, the bottom sheet is closed and the onCancel function is not called', () => {
      const { wrapper, mockGoBack, mockNavigation } = setupTest();

      const cancelButton = wrapper.getByRole('button', {
        name: strings('account_backup_step_1.skip_button_cancel'),
      });

      fireEvent.press(cancelButton);
      expect(mockGoBack).toHaveBeenCalled();
      expect(mockOnCancel).toHaveBeenCalledTimes(0);
      mockNavigation.mockRestore();
    });

    it('on skip button press, the bottom sheet is closed and the onConfirm function is not called', () => {
      const { wrapper, mockGoBack, mockNavigation } = setupTest();

      const confirmButton = wrapper.getByRole('button', {
        name: strings('account_backup_step_1.skip_button_confirm'),
      });

      fireEvent.press(confirmButton);
      expect(mockGoBack).toHaveBeenCalled();
      expect(mockOnConfirm).toHaveBeenCalledTimes(0);
      mockNavigation.mockRestore();
    });
  });
});
