import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Text, View, TouchableOpacity, Image } from 'react-native';
import OnboardingStep from './OnboardingStep';

// Mock dependencies
jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: jest.fn(() => ({
    style: jest.fn((...args) => args.join(' ')),
  })),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text: RNText } = jest.requireActual('react-native');

  return {
    Box: ({
      children,
      testID,
      twClassName,
      ...props
    }: {
      children?: React.ReactNode;
      testID?: string;
      twClassName?: string;
      [key: string]: unknown;
    }) =>
      ReactActual.createElement(
        View,
        { testID, 'data-tw-class': twClassName, ...props },
        children,
      ),
    Text: ({
      children,
      testID,
      variant,
      twClassName,
      ...props
    }: {
      children?: React.ReactNode;
      testID?: string;
      variant?: string;
      twClassName?: string;
      [key: string]: unknown;
    }) =>
      ReactActual.createElement(
        RNText,
        {
          testID,
          'data-variant': variant,
          'data-tw-class': twClassName,
          ...props,
        },
        children,
      ),
    TextVariant: {
      HeadingMd: 'HeadingMd',
      BodyMd: 'BodyMd',
    },
  };
});

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => {
    const ReactActual = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    return ReactActual.createElement(
      View,
      { testID: 'safe-area-view', ...props },
      children,
    );
  },
}));

// Mock the FOX logo image
jest.mock('../../../../../images/branding/fox.png', () => 'fox-logo');

describe('OnboardingStep', () => {
  const defaultProps = {
    title: 'Test Title',
    description: 'Test Description',
    formFields: (
      <View testID="test-form-fields">
        <Text>Form Fields</Text>
      </View>
    ),
    actions: (
      <TouchableOpacity testID="test-actions">
        <Text>Actions</Text>
      </TouchableOpacity>
    ),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders without crashing with required props', () => {
      render(<OnboardingStep {...defaultProps} />);

      expect(screen.getByTestId('safe-area-view')).toBeDefined();
    });

    it('renders with all required props provided', () => {
      const { getByText } = render(<OnboardingStep {...defaultProps} />);

      expect(getByText('Test Title')).toBeDefined();
      expect(getByText('Test Description')).toBeDefined();
      expect(getByText('Form Fields')).toBeDefined();
      expect(getByText('Actions')).toBeDefined();
    });
  });

  describe('Critical Visual Elements', () => {
    it('displays the FOX logo image', () => {
      const { UNSAFE_getByType } = render(<OnboardingStep {...defaultProps} />);

      const images = UNSAFE_getByType(Image);
      expect(images).toBeDefined();
      expect(images.props.source).toBe('fox-logo');
      expect(images.props.resizeMode).toBe('contain');
    });

    it('displays the title with correct variant and styling', () => {
      const { getByText } = render(<OnboardingStep {...defaultProps} />);

      const titleElement = getByText('Test Title');
      expect(titleElement).toBeDefined();
      expect(titleElement.props['data-variant']).toBe('HeadingMd');
      expect(titleElement.props['data-tw-class']).toContain('text-center');
    });

    it('displays the description with correct variant and styling', () => {
      const { getByText } = render(<OnboardingStep {...defaultProps} />);

      const descriptionElement = getByText('Test Description');
      expect(descriptionElement).toBeDefined();
      expect(descriptionElement.props['data-variant']).toBe('BodyMd');
      expect(descriptionElement.props['data-tw-class']).toContain(
        'text-center',
      );
    });

    it('renders form fields in the correct container', () => {
      const { getByTestId } = render(<OnboardingStep {...defaultProps} />);

      expect(getByTestId('test-form-fields')).toBeDefined();
    });

    it('renders actions in the correct container', () => {
      const { getByTestId } = render(<OnboardingStep {...defaultProps} />);

      expect(getByTestId('test-actions')).toBeDefined();
    });
  });

  describe('Layout Structure', () => {
    it('renders with proper container structure', () => {
      const { getByTestId } = render(<OnboardingStep {...defaultProps} />);

      // Verify SafeAreaView is rendered with correct props
      const safeAreaView = getByTestId('safe-area-view');
      expect(safeAreaView).toBeDefined();
      expect(safeAreaView.props.edges).toEqual(['bottom']);
    });

    it('maintains proper component hierarchy', () => {
      const { getByText, getByTestId } = render(
        <OnboardingStep {...defaultProps} />,
      );

      // Verify all main elements are present in the component tree
      expect(getByTestId('safe-area-view')).toBeDefined();
      expect(getByText('Test Title')).toBeDefined();
      expect(getByText('Test Description')).toBeDefined();
      expect(getByTestId('test-form-fields')).toBeDefined();
      expect(getByTestId('test-actions')).toBeDefined();
    });
  });

  describe('Component Props Handling', () => {
    it('handles empty form fields gracefully', () => {
      const propsWithEmptyForm = {
        ...defaultProps,
        formFields: null,
      };

      expect(() =>
        render(<OnboardingStep {...propsWithEmptyForm} />),
      ).not.toThrow();
    });

    it('handles empty actions gracefully', () => {
      const propsWithEmptyActions = {
        ...defaultProps,
        actions: null,
      };

      expect(() =>
        render(<OnboardingStep {...propsWithEmptyActions} />),
      ).not.toThrow();
    });

    it('handles long title text', () => {
      const longTitle =
        'This is a very long title that should still render correctly without breaking the layout';
      const propsWithLongTitle = {
        ...defaultProps,
        title: longTitle,
      };

      const { getByText } = render(<OnboardingStep {...propsWithLongTitle} />);
      expect(getByText(longTitle)).toBeDefined();
    });

    it('handles long description text', () => {
      const longDescription =
        'This is a very long description that should still render correctly without breaking the layout and should wrap properly';
      const propsWithLongDescription = {
        ...defaultProps,
        description: longDescription,
      };

      const { getByText } = render(
        <OnboardingStep {...propsWithLongDescription} />,
      );
      expect(getByText(longDescription)).toBeDefined();
    });
  });

  describe('Accessibility', () => {
    it('renders text elements that are accessible by default', () => {
      const { getByText } = render(<OnboardingStep {...defaultProps} />);

      const titleElement = getByText('Test Title');
      const descriptionElement = getByText('Test Description');

      expect(titleElement).toBeDefined();
      expect(descriptionElement).toBeDefined();
    });

    it('maintains proper semantic structure with headings and content', () => {
      const { getByText } = render(<OnboardingStep {...defaultProps} />);

      const titleElement = getByText('Test Title');
      expect(titleElement.props['data-variant']).toBe('HeadingMd');

      const descriptionElement = getByText('Test Description');
      expect(descriptionElement.props['data-variant']).toBe('BodyMd');
    });
  });

  describe('Component Integration', () => {
    it('integrates properly with complex form fields', () => {
      const complexFormFields = (
        <View testID="complex-form">
          <Text>Input Field 1</Text>
          <Text>Input Field 2</Text>
          <TouchableOpacity testID="form-button">
            <Text>Form Button</Text>
          </TouchableOpacity>
        </View>
      );

      const propsWithComplexForm = {
        ...defaultProps,
        formFields: complexFormFields,
      };

      const { getByTestId, getByText } = render(
        <OnboardingStep {...propsWithComplexForm} />,
      );

      expect(getByTestId('complex-form')).toBeDefined();
      expect(getByText('Input Field 1')).toBeDefined();
      expect(getByText('Input Field 2')).toBeDefined();
      expect(getByTestId('form-button')).toBeDefined();
    });

    it('integrates properly with complex actions', () => {
      const complexActions = (
        <View testID="complex-actions">
          <TouchableOpacity testID="primary-action">
            <Text>Primary Action</Text>
          </TouchableOpacity>
          <TouchableOpacity testID="secondary-action">
            <Text>Secondary Action</Text>
          </TouchableOpacity>
        </View>
      );

      const propsWithComplexActions = {
        ...defaultProps,
        actions: complexActions,
      };

      const { getByTestId, getByText } = render(
        <OnboardingStep {...propsWithComplexActions} />,
      );

      expect(getByTestId('complex-actions')).toBeDefined();
      expect(getByTestId('primary-action')).toBeDefined();
      expect(getByTestId('secondary-action')).toBeDefined();
      expect(getByText('Primary Action')).toBeDefined();
      expect(getByText('Secondary Action')).toBeDefined();
    });
  });
});
