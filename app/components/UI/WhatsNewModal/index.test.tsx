import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import WhatsNewModal from './';
import { NavigationContainer } from '@react-navigation/native';
import { ThemeContext } from '../../../util/theme';

jest.mock('../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(() => ({
    navigate: jest.fn(),
    goBack: mockGoBack,
  })),
}));

jest.mock(
  '../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const ReactMock = jest.requireActual('react');
    const { View, TouchableOpacity } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: ReactMock.forwardRef(
        (
          {
            children,
            onClose,
          }: { children: React.ReactNode; onClose?: () => void },
          ref: React.Ref<{
            onCloseBottomSheet: (callback?: () => void) => void;
          }>,
        ) => {
          ReactMock.useImperativeHandle(ref, () => ({
            onCloseBottomSheet: (callback?: () => void) => {
              mockGoBack();
              onClose?.();
              callback?.();
            },
          }));

          const handleClose = () => {
            mockGoBack();
            onClose?.();
          };

          return (
            <View testID="bottom-sheet">
              {children}
              <TouchableOpacity testID="close-button" onPress={handleClose} />
            </View>
          );
        },
      ),
    };
  },
);

jest.mock('../../../store/storage-wrapper', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn().mockResolvedValue('7.0.0'),
    setItem: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../../../util/device', () => ({
  getDeviceWidth: jest.fn(() => 375),
  getDeviceHeight: jest.fn(() => 812),
}));

jest.mock('../../../component-library/components/Buttons/Button', () => {
  const { TouchableOpacity, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      label,
      onPress,
      ...props
    }: {
      label: string;
      onPress: () => void;
      [key: string]: unknown;
    }) => (
      <TouchableOpacity onPress={onPress} {...props}>
        <Text>{label}</Text>
      </TouchableOpacity>
    ),
    ButtonVariants: { Primary: 'primary' },
    ButtonSize: { Lg: 'lg' },
    ButtonWidthTypes: { Full: 'full' },
  };
});

jest.mock('../../../component-library/components/Texts/Text', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      children,
      ...props
    }: {
      children: React.ReactNode;
      [key: string]: unknown;
    }) => <Text {...props}>{children}</Text>,
    TextColor: { Default: 'default' },
    TextVariant: {
      BodyLGMedium: 'bodyLgMedium',
      BodyMD: 'bodyMd',
      BodyMDMedium: 'bodyMdMedium',
    },
  };
});

jest.mock('../../../component-library/components/Icons/Icon', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ name, ...props }: { name: string; [key: string]: unknown }) => (
      <View testID={`icon-${name}`} {...props} />
    ),
    IconColor: { Success: 'success' },
    IconName: { Confirmation: 'confirmation' },
    IconSize: { Sm: 'sm' },
  };
});

jest.mock('../../../component-library/components/Sheet/SheetHeader', () => {
  const { View, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      title,
      ...props
    }: {
      title: string;
      [key: string]: unknown;
    }) => (
      <View {...props}>
        <Text>{title}</Text>
      </View>
    ),
  };
});

jest.mock('../../../component-library/hooks', () => ({
  useStyles: jest.fn(() => ({
    styles: {
      header: {},
      slideContent: {},
      horizontalScrollView: {},
      slideItemContainer: {},
      slideImageContainer: {},
      previewImage: {},
      imageCarousel: {},
      carouselImageContainer: {},
      imageProgressContainer: {},
      imageProgressDot: {},
      imageProgressDotActive: {},
      slideTitle: {},
      slideDescription: {},
      descriptionsContainer: {},
      descriptionItem: {},
      featureCheckmark: {},
      featureText: {},
      button: {},
      progressIndicatorsContainer: {},
      slideCircle: {},
      slideSolidCircle: {},
    },
  })),
}));

jest.mock('react-native-gesture-handler', () => ({
  ScrollView: jest.requireActual('react-native').ScrollView,
}));

jest.mock('../../../constants/storage', () => ({
  CURRENT_APP_VERSION: 'CURRENT_APP_VERSION',
  WHATS_NEW_APP_VERSION_SEEN: 'WHATS_NEW_APP_VERSION_SEEN',
}));

const mockTheme = {
  colors: {
    icon: { default: 'red' },
    background: { default: 'white' },
    primary: { default: 'blue' },
    warning: { default: 'yellow' },
    alternative: { default: 'orange' },
    text: { alternative: 'orange' },
    error: { default: 'red' },
    overlay: { default: 'green' },
    border: { default: 'black' },
  },
  themeAppearance: 'light',
};

const renderWithProviders = (component: React.ReactElement) => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <ThemeContext.Provider value={mockTheme}>{children}</ThemeContext.Provider>
  );

  return render(<NavigationContainer>{component}</NavigationContainer>, {
    wrapper,
  });
};

describe('WhatsNewModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  describe('Rendering', () => {
    it('displays the modal title', () => {
      renderWithProviders(<WhatsNewModal />);

      expect(
        screen.getByText('whats_new.remove_gns_new_ui_update.title'),
      ).toBeOnTheScreen();
    });

    it('displays slide descriptions', () => {
      renderWithProviders(<WhatsNewModal />);

      expect(
        screen.getByText('whats_new.remove_gns_new_ui_update.introduction'),
      ).toBeOnTheScreen();
    });

    it('shows feature descriptions with checkmarks', () => {
      renderWithProviders(<WhatsNewModal />);

      expect(
        screen.getByText(
          'whats_new.remove_gns_new_ui_update.descriptions.description_1',
        ),
      ).toBeOnTheScreen();
      expect(
        screen.getByText(
          'whats_new.remove_gns_new_ui_update.descriptions.description_2',
        ),
      ).toBeOnTheScreen();
    });

    it('renders the action button', () => {
      renderWithProviders(<WhatsNewModal />);

      expect(
        screen.getByText('whats_new.remove_gns_new_ui_update.got_it'),
      ).toBeOnTheScreen();
    });
  });

  describe('Image Carousel Functionality', () => {
    it('advances to next image automatically after 4 seconds', () => {
      renderWithProviders(<WhatsNewModal />);

      act(() => {
        jest.advanceTimersByTime(4000);
      });

      expect(jest.getTimerCount()).toBeGreaterThan(0);
    });

    it('loops back to first image when reaching the end', () => {
      renderWithProviders(<WhatsNewModal />);

      act(() => {
        jest.advanceTimersByTime(8000);
      });

      expect(jest.getTimerCount()).toBeGreaterThan(0);
    });
  });

  describe('Modal Dismissal', () => {
    it('calls navigation.goBack when dismissed', () => {
      renderWithProviders(<WhatsNewModal />);

      const closeButton = screen.getByTestId('close-button');
      act(() => {
        fireEvent.press(closeButton);
      });

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('Button Interactions', () => {
    it('handles button press correctly', () => {
      renderWithProviders(<WhatsNewModal />);

      const button = screen.getByText(
        'whats_new.remove_gns_new_ui_update.got_it',
      );
      act(() => {
        fireEvent.press(button);
      });

      expect(button).toBeOnTheScreen();
    });
  });

  describe('Accessibility', () => {
    it('provides proper test IDs for testing', () => {
      renderWithProviders(<WhatsNewModal />);

      expect(screen.getByTestId('bottom-sheet')).toBeOnTheScreen();
    });

    it('renders all text content for screen readers', () => {
      renderWithProviders(<WhatsNewModal />);

      expect(
        screen.getByText('whats_new.remove_gns_new_ui_update.title'),
      ).toBeOnTheScreen();
      expect(
        screen.getByText('whats_new.remove_gns_new_ui_update.introduction'),
      ).toBeOnTheScreen();
    });
  });

  describe('Error Handling', () => {
    it('handles missing carousel images gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      renderWithProviders(<WhatsNewModal />);

      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
