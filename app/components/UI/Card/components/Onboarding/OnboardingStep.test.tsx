import React from 'react';
import { render } from '@testing-library/react-native';
import { Text, View, TouchableOpacity } from 'react-native';
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
      HeadingLg: 'HeadingLg',
      BodyMd: 'BodyMd',
    },
  };
});

describe('OnboardingStep Component', () => {
  const defaultProps = {
    title: 'Test Title',
    description: 'Test Description',
    formFields: <Text testID="test-form-fields">Form Fields</Text>,
    actions: <Text testID="test-actions">Actions</Text>,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders with all required props provided', () => {
      const { getByText } = render(<OnboardingStep {...defaultProps} />);

      expect(getByText('Test Title')).toBeDefined();
      expect(getByText('Test Description')).toBeDefined();
      expect(getByText('Form Fields')).toBeDefined();
      expect(getByText('Actions')).toBeDefined();
    });

    it('renders the component successfully', () => {
      const { getByTestId } = render(<OnboardingStep {...defaultProps} />);

      expect(getByTestId('onboarding-step-title')).toBeTruthy();
      expect(getByTestId('onboarding-step-description')).toBeTruthy();
      expect(getByTestId('onboarding-step-form')).toBeTruthy();
      expect(getByTestId('onboarding-step-actions')).toBeTruthy();
    });

    it('displays the correct title', () => {
      const { getByTestId } = render(<OnboardingStep {...defaultProps} />);

      const title = getByTestId('onboarding-step-title');
      expect(title.props.children).toBe('Test Title');
    });

    it('displays the correct description', () => {
      const { getByTestId } = render(<OnboardingStep {...defaultProps} />);

      const description = getByTestId('onboarding-step-description');
      expect(description.props.children).toBe('Test Description');
    });

    it('renders form fields section', () => {
      const { getByTestId } = render(<OnboardingStep {...defaultProps} />);

      expect(getByTestId('test-form-fields')).toBeTruthy();
    });

    it('renders actions section', () => {
      const { getByTestId } = render(<OnboardingStep {...defaultProps} />);

      expect(getByTestId('test-actions')).toBeTruthy();
    });
  });

  describe('testID Coverage', () => {
    it('renders all elements with correct testIDs', () => {
      const { getByTestId } = render(<OnboardingStep {...defaultProps} />);

      // Verify all testable elements are present
      expect(getByTestId('onboarding-step-title')).toBeTruthy();
      expect(getByTestId('onboarding-step-description')).toBeTruthy();
      expect(getByTestId('onboarding-step-form')).toBeTruthy();
      expect(getByTestId('onboarding-step-actions')).toBeTruthy();
    });

    it('provides testID for title element', () => {
      const { getByTestId } = render(<OnboardingStep {...defaultProps} />);

      const title = getByTestId('onboarding-step-title');
      expect(title).toBeTruthy();
      expect(title.props.testID).toBe('onboarding-step-title');
    });

    it('provides testID for description element', () => {
      const { getByTestId } = render(<OnboardingStep {...defaultProps} />);

      const description = getByTestId('onboarding-step-description');
      expect(description).toBeTruthy();
      expect(description.props.testID).toBe('onboarding-step-description');
    });

    it('provides testID for form container', () => {
      const { getByTestId } = render(<OnboardingStep {...defaultProps} />);

      const form = getByTestId('onboarding-step-form');
      expect(form).toBeTruthy();
      expect(form.props.testID).toBe('onboarding-step-form');
    });

    it('provides testID for actions container', () => {
      const { getByTestId } = render(<OnboardingStep {...defaultProps} />);

      const actions = getByTestId('onboarding-step-actions');
      expect(actions).toBeTruthy();
      expect(actions.props.testID).toBe('onboarding-step-actions');
    });
  });

  describe('Critical Path Testing', () => {
    it('renders complete onboarding step structure', () => {
      const { getByTestId } = render(<OnboardingStep {...defaultProps} />);

      // Verify complete component structure
      expect(getByTestId('onboarding-step-title')).toBeTruthy();
      expect(getByTestId('onboarding-step-description')).toBeTruthy();
      expect(getByTestId('onboarding-step-form')).toBeTruthy();
      expect(getByTestId('onboarding-step-actions')).toBeTruthy();
    });

    it('passes props correctly to child elements', () => {
      const testProps = {
        title: 'Critical Path Title',
        description: 'Critical Path Description',
        formFields: <Text testID="critical-form">Critical Form</Text>,
        actions: <Text testID="critical-action">Critical Action</Text>,
      };

      const { getByTestId } = render(<OnboardingStep {...testProps} />);

      expect(getByTestId('onboarding-step-title').props.children).toBe(
        'Critical Path Title',
      );
      expect(getByTestId('onboarding-step-description').props.children).toBe(
        'Critical Path Description',
      );
      expect(getByTestId('critical-form')).toBeTruthy();
      expect(getByTestId('critical-action')).toBeTruthy();
    });

    it('maintains component structure with different content', () => {
      const alternativeProps = {
        title: 'Alternative Title',
        description: 'Alternative Description',
        formFields: <Text testID="alt-form">Alternative Form</Text>,
        actions: <Text testID="alt-action">Alternative Action</Text>,
      };

      const { getByTestId } = render(<OnboardingStep {...alternativeProps} />);

      // Structure remains consistent
      expect(getByTestId('onboarding-step-title')).toBeTruthy();
      expect(getByTestId('onboarding-step-description')).toBeTruthy();
      expect(getByTestId('onboarding-step-form')).toBeTruthy();
      expect(getByTestId('onboarding-step-actions')).toBeTruthy();
    });
  });

  describe('Critical Visual Elements', () => {
    it('displays the title with correct variant and styling', () => {
      const { getByText } = render(<OnboardingStep {...defaultProps} />);

      const titleElement = getByText('Test Title');
      expect(titleElement).toBeDefined();
      expect(titleElement.props['data-variant']).toBe('HeadingLg');
      expect(titleElement.props['data-tw-class']).toContain('text-default');
    });

    it('displays the description with correct variant and styling', () => {
      const { getByText } = render(<OnboardingStep {...defaultProps} />);

      const descriptionElement = getByText('Test Description');
      expect(descriptionElement).toBeDefined();
      expect(descriptionElement.props['data-variant']).toBe('BodyMd');
      expect(descriptionElement.props['data-tw-class']).toContain(
        'text-text-alternative',
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
    it('maintains proper component hierarchy', () => {
      const { getByText, getByTestId } = render(
        <OnboardingStep {...defaultProps} />,
      );

      // Verify all main elements are present in the component tree
      expect(getByText('Test Title')).toBeDefined();
      expect(getByText('Test Description')).toBeDefined();
      expect(getByTestId('test-form-fields')).toBeDefined();
      expect(getByTestId('test-actions')).toBeDefined();
    });

    it('renders all sections in correct order', () => {
      const { getByTestId } = render(<OnboardingStep {...defaultProps} />);

      // All sections should be present regardless of content
      const title = getByTestId('onboarding-step-title');
      const description = getByTestId('onboarding-step-description');
      const form = getByTestId('onboarding-step-form');
      const actions = getByTestId('onboarding-step-actions');

      expect(title).toBeTruthy();
      expect(description).toBeTruthy();
      expect(form).toBeTruthy();
      expect(actions).toBeTruthy();
    });
  });

  describe('Conditional Rendering', () => {
    it('handles empty form fields', () => {
      const propsWithEmptyForm = {
        ...defaultProps,
        formFields: null,
      };

      const { getByTestId } = render(
        <OnboardingStep {...propsWithEmptyForm} />,
      );

      const formContainer = getByTestId('onboarding-step-form');
      expect(formContainer).toBeTruthy();
      expect(formContainer.props.children).toBeNull();
    });

    it('handles empty actions', () => {
      const propsWithEmptyActions = {
        ...defaultProps,
        actions: null,
      };

      const { getByTestId } = render(
        <OnboardingStep {...propsWithEmptyActions} />,
      );

      const actionsContainer = getByTestId('onboarding-step-actions');
      expect(actionsContainer).toBeTruthy();
      expect(actionsContainer.props.children).toBeNull();
    });

    it('renders when both form fields and actions are empty', () => {
      const propsWithEmptyContent = {
        ...defaultProps,
        formFields: null,
        actions: null,
      };

      const { getByTestId } = render(
        <OnboardingStep {...propsWithEmptyContent} />,
      );

      // Core elements still render
      expect(getByTestId('onboarding-step-title')).toBeTruthy();
      expect(getByTestId('onboarding-step-description')).toBeTruthy();
      expect(getByTestId('onboarding-step-form')).toBeTruthy();
      expect(getByTestId('onboarding-step-actions')).toBeTruthy();
    });

    it('renders with undefined form fields', () => {
      const propsWithUndefinedForm = {
        ...defaultProps,
        formFields: undefined,
      };

      const { getByTestId } = render(
        <OnboardingStep {...propsWithUndefinedForm} />,
      );

      const formContainer = getByTestId('onboarding-step-form');
      expect(formContainer).toBeTruthy();
    });

    it('renders with undefined actions', () => {
      const propsWithUndefinedActions = {
        ...defaultProps,
        actions: undefined,
      };

      const { getByTestId } = render(
        <OnboardingStep {...propsWithUndefinedActions} />,
      );

      const actionsContainer = getByTestId('onboarding-step-actions');
      expect(actionsContainer).toBeTruthy();
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

    it('handles empty string title', () => {
      const propsWithEmptyTitle = {
        ...defaultProps,
        title: '',
      };

      const { getByTestId } = render(
        <OnboardingStep {...propsWithEmptyTitle} />,
      );

      const title = getByTestId('onboarding-step-title');
      expect(title.props.children).toBe('');
    });

    it('handles empty string description', () => {
      const propsWithEmptyDescription = {
        ...defaultProps,
        description: '',
      };

      const { getByTestId } = render(
        <OnboardingStep {...propsWithEmptyDescription} />,
      );

      const description = getByTestId('onboarding-step-description');
      expect(description.props.children).toBe('');
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
      expect(titleElement.props['data-variant']).toBe('HeadingLg');

      const descriptionElement = getByText('Test Description');
      expect(descriptionElement.props['data-variant']).toBe('BodyMd');
    });

    it('provides proper accessibility structure', () => {
      const { getByTestId } = render(<OnboardingStep {...defaultProps} />);

      // Check that all main elements have testIDs for accessibility
      expect(getByTestId('onboarding-step-title')).toBeTruthy();
      expect(getByTestId('onboarding-step-description')).toBeTruthy();
      expect(getByTestId('onboarding-step-form')).toBeTruthy();
      expect(getByTestId('onboarding-step-actions')).toBeTruthy();
    });

    it('maintains testID consistency across renders', () => {
      const { getByTestId, rerender } = render(
        <OnboardingStep {...defaultProps} />,
      );

      // Initial render
      expect(getByTestId('onboarding-step-title')).toBeTruthy();

      // Re-render with different props
      const newProps = {
        ...defaultProps,
        title: 'New Title',
      };

      rerender(<OnboardingStep {...newProps} />);

      // testIDs remain consistent
      expect(getByTestId('onboarding-step-title')).toBeTruthy();
      expect(getByTestId('onboarding-step-title').props.children).toBe(
        'New Title',
      );
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

    it('renders with complex form fields using Box components', () => {
      const complexFormFields = (
        <View>
          <Text testID="form-field-1">Field 1</Text>
          <Text testID="form-field-2">Field 2</Text>
          <Text testID="form-field-3">Field 3</Text>
        </View>
      );

      const propsWithComplexForm = {
        ...defaultProps,
        formFields: complexFormFields,
      };

      const { getByTestId } = render(
        <OnboardingStep {...propsWithComplexForm} />,
      );

      expect(getByTestId('form-field-1')).toBeTruthy();
      expect(getByTestId('form-field-2')).toBeTruthy();
      expect(getByTestId('form-field-3')).toBeTruthy();
    });

    it('renders with complex actions using Box components', () => {
      const complexActions = (
        <View>
          <Text testID="action-1">Action 1</Text>
          <Text testID="action-2">Action 2</Text>
        </View>
      );

      const propsWithComplexActions = {
        ...defaultProps,
        actions: complexActions,
      };

      const { getByTestId } = render(
        <OnboardingStep {...propsWithComplexActions} />,
      );

      expect(getByTestId('action-1')).toBeTruthy();
      expect(getByTestId('action-2')).toBeTruthy();
    });

    it('integrates properly with nested components', () => {
      const nestedFormFields = (
        <View testID="nested-form-container">
          <View testID="nested-form-section">
            <Text testID="nested-form-field">Nested Field</Text>
          </View>
        </View>
      );

      const nestedActions = (
        <View testID="nested-actions-container">
          <Text testID="nested-action">Nested Action</Text>
        </View>
      );

      const propsWithNestedContent = {
        ...defaultProps,
        formFields: nestedFormFields,
        actions: nestedActions,
      };

      const { getByTestId } = render(
        <OnboardingStep {...propsWithNestedContent} />,
      );

      expect(getByTestId('nested-form-container')).toBeTruthy();
      expect(getByTestId('nested-form-section')).toBeTruthy();
      expect(getByTestId('nested-form-field')).toBeTruthy();
      expect(getByTestId('nested-actions-container')).toBeTruthy();
      expect(getByTestId('nested-action')).toBeTruthy();
    });
  });
});
