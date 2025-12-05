import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import InfoModal from './InfoModal';

// Mock IonicIcon
jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');

// Mock react-native-modal
jest.mock('react-native-modal', () => {
  const MockedModal = ({
    isVisible,
    children,
  }: {
    isVisible?: boolean;
    children?: React.ReactNode;
    [key: string]: unknown;
  }) => {
    if (!isVisible) return null;
    return <>{children}</>;
  };
  return MockedModal;
});

// Mock Base/Text component
jest.mock('./Text', () => {
  /* eslint-disable @typescript-eslint/no-shadow */
  const React = jest.requireActual('react');
  const { Text: RNText } = jest.requireActual('react-native');
  /* eslint-enable @typescript-eslint/no-shadow */
  return {
    __esModule: true,
    default: (props: { children?: React.ReactNode; [key: string]: unknown }) =>
      React.createElement(RNText, props, props.children),
  };
});

// Mock Base/Title component
jest.mock('./Title', () => {
  /* eslint-disable @typescript-eslint/no-shadow */
  const React = jest.requireActual('react');
  const { Text: RNText } = jest.requireActual('react-native');
  /* eslint-enable @typescript-eslint/no-shadow */
  return {
    __esModule: true,
    default: (props: { children?: React.ReactNode; [key: string]: unknown }) =>
      React.createElement(RNText, props, props.children),
  };
});

// Mock useTheme hook
jest.mock('../../util/theme', () => ({
  useTheme: jest.fn(() => ({
    colors: {
      background: { default: '#FFFFFF' },
      text: { default: '#000000' },
      overlay: { default: '#00000099' },
    },
    shadows: {
      size: {
        sm: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
      },
    },
  })),
}));

describe('InfoModal', () => {
  const mockToggleModal = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders content when visible', () => {
      const { queryByText } = render(
        <InfoModal
          isVisible
          title="Test Title"
          toggleModal={mockToggleModal}
        />,
      );

      expect(queryByText('Test Title')).toBeOnTheScreen();
    });

    it('hides content when not visible', () => {
      const { queryByText } = render(
        <InfoModal
          isVisible={false}
          title="Test Title"
          toggleModal={mockToggleModal}
        />,
      );

      expect(queryByText('Test Title')).toBeNull();
    });

    it('renders title as string', () => {
      const { getByText } = render(
        <InfoModal
          isVisible
          title="String Title"
          toggleModal={mockToggleModal}
        />,
      );

      expect(getByText('String Title')).toBeOnTheScreen();
    });

    it('renders title as ReactNode', () => {
      const { getByText } = render(
        <InfoModal
          isVisible
          title={<>ReactNode Title</>}
          toggleModal={mockToggleModal}
        />,
      );

      expect(getByText('ReactNode Title')).toBeOnTheScreen();
    });

    it('renders body as ReactNode', () => {
      const { Text: RNText } = jest.requireActual('react-native');

      const { getByText } = render(
        <InfoModal
          isVisible
          body={<RNText>Body Content</RNText>}
          toggleModal={mockToggleModal}
        />,
      );

      expect(getByText('Body Content')).toBeOnTheScreen();
    });

    it('renders message text', () => {
      const { getByText } = render(
        <InfoModal
          isVisible
          message="Test message"
          toggleModal={mockToggleModal}
        />,
      );

      expect(getByText('Test message')).toBeOnTheScreen();
    });

    it('renders urlText link when provided with message', () => {
      const { getByText } = render(
        <InfoModal
          isVisible
          message="Test message"
          urlText="Learn more"
          toggleModal={mockToggleModal}
        />,
      );

      expect(getByText('Learn more')).toBeOnTheScreen();
    });

    it('renders complete modal with all props', () => {
      const mockUrlCallback = jest.fn();
      const { Text: RNText } = jest.requireActual('react-native');

      const { getByText } = render(
        <InfoModal
          isVisible
          title="Full Title"
          body={<RNText>Full Body</RNText>}
          message="Full Message"
          urlText="Full Link"
          url={mockUrlCallback}
          toggleModal={mockToggleModal}
          propagateSwipe
          testID="full-modal"
        />,
      );

      expect(getByText('Full Title')).toBeOnTheScreen();
      expect(getByText('Full Body')).toBeOnTheScreen();
      expect(getByText('Full Message')).toBeOnTheScreen();
      expect(getByText('Full Link')).toBeOnTheScreen();
    });
  });

  describe('Interactions', () => {
    it('calls url callback when link is pressed', () => {
      const mockUrlCallback = jest.fn();

      const { getByText } = render(
        <InfoModal
          isVisible
          message="Test message"
          urlText="Click here"
          url={mockUrlCallback}
          toggleModal={mockToggleModal}
        />,
      );

      fireEvent.press(getByText('Click here'));

      expect(mockUrlCallback).toHaveBeenCalledTimes(1);
    });
  });
});
