// Third party dependencies.
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// Internal dependencies.
import StepperCard from './StepperCard';
import type { StepperCardStep } from './StepperCard.types';
import { GlassView } from 'expo-glass-effect';
import { GLASS_SURFACE_SHEEN_TEST_ID } from '../GlassSurface';
import { mockTheme } from '../../../util/theme';

jest.mock('@metamask/design-system-twrnc-preset', () => {
  const tw = (..._args: unknown[]) => ({});
  tw.style = jest.fn(() => ({}));
  return { useTailwind: () => tw };
});

const mockImage = { uri: 'test-image' };

const makeStep = (overrides?: Partial<StepperCardStep>): StepperCardStep => ({
  title: 'Test Title',
  description: 'Test description',
  image: mockImage,
  primaryCta: {
    text: 'Primary',
    onPress: jest.fn(),
  },
  ...overrides,
});

describe('StepperCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('content rendering', () => {
    it('renders the current step title', () => {
      const { getByTestId } = render(
        <StepperCard
          steps={[makeStep({ title: 'Onboarding Step' })]}
          currentStep={0}
          testID="card"
        />,
      );
      expect(getByTestId('card-title')).toHaveTextContent('Onboarding Step');
    });

    it('renders the current step description', () => {
      const { getByTestId } = render(
        <StepperCard
          steps={[makeStep({ description: 'Fund your account' })]}
          currentStep={0}
          testID="card"
        />,
      );
      expect(getByTestId('card-description')).toHaveTextContent(
        'Fund your account',
      );
    });

    it('renders the container with the derived testID', () => {
      const { getByTestId } = render(
        <StepperCard steps={[makeStep()]} currentStep={0} testID="my-card" />,
      );
      expect(getByTestId('my-card-container')).toBeOnTheScreen();
    });

    it('renders the step at the given currentStep index', () => {
      const { getByTestId } = render(
        <StepperCard
          steps={[makeStep({ title: 'Step 1' }), makeStep({ title: 'Step 2' })]}
          currentStep={1}
          testID="card"
        />,
      );
      expect(getByTestId('card-title')).toHaveTextContent('Step 2');
    });
  });

  describe('completion bounds guard', () => {
    it('returns null when currentStep equals steps.length', () => {
      const { toJSON } = render(
        <StepperCard steps={[makeStep()]} currentStep={1} />,
      );
      expect(toJSON()).toBeNull();
    });

    it('returns null when currentStep exceeds steps.length', () => {
      const { toJSON } = render(
        <StepperCard steps={[makeStep()]} currentStep={99} />,
      );
      expect(toJSON()).toBeNull();
    });

    it('calls onComplete when currentStep reaches steps.length', () => {
      const onComplete = jest.fn();
      render(
        <StepperCard
          steps={[makeStep()]}
          currentStep={1}
          onComplete={onComplete}
        />,
      );
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  describe('primary CTA', () => {
    it('renders the primary CTA text', () => {
      const { getByText } = render(
        <StepperCard
          steps={[
            makeStep({
              primaryCta: { text: 'Get started', onPress: jest.fn() },
            }),
          ]}
          currentStep={0}
        />,
      );
      expect(getByText('Get started')).toBeOnTheScreen();
    });

    it('fires primaryCta.onPress when pressed', () => {
      const onPress = jest.fn();
      const { getByText } = render(
        <StepperCard
          steps={[makeStep({ primaryCta: { text: 'Go', onPress } })]}
          currentStep={0}
        />,
      );
      fireEvent.press(getByText('Go'));
      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('does not fire primaryCta.onPress when disabled', () => {
      const onPress = jest.fn();
      const { getByTestId } = render(
        <StepperCard
          steps={[
            makeStep({
              primaryCta: { text: 'Go', onPress, disabled: true },
            }),
          ]}
          currentStep={0}
          testID="stepper-card"
        />,
      );

      fireEvent.press(getByTestId('stepper-card-cta-button'));
      expect(onPress).not.toHaveBeenCalled();
    });
  });

  describe('secondary CTA', () => {
    it('does not render secondary CTA when secondaryCta is absent', () => {
      const { queryByText } = render(
        <StepperCard steps={[makeStep()]} currentStep={0} />,
      );
      expect(queryByText('Skip')).toBeNull();
    });

    it('renders secondary CTA when secondaryCta is provided', () => {
      const { getByText } = render(
        <StepperCard
          steps={[
            makeStep({
              secondaryCta: { text: 'Skip', onPress: jest.fn() },
            }),
          ]}
          currentStep={0}
        />,
      );
      expect(getByText('Skip')).toBeOnTheScreen();
    });

    it('fires secondaryCta.onPress when pressed', () => {
      const onSecondaryPress = jest.fn();
      const { getByText } = render(
        <StepperCard
          steps={[
            makeStep({
              secondaryCta: { text: 'Skip', onPress: onSecondaryPress },
            }),
          ]}
          currentStep={0}
        />,
      );
      fireEvent.press(getByText('Skip'));
      expect(onSecondaryPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('description tooltip', () => {
    it('does not render tooltip icon when onDescriptionTooltipPress is absent', () => {
      const { queryByLabelText } = render(
        <StepperCard steps={[makeStep()]} currentStep={0} />,
      );
      expect(queryByLabelText('More information')).toBeNull();
    });

    it('renders tooltip icon when onDescriptionTooltipPress is provided', () => {
      const { getByLabelText } = render(
        <StepperCard
          steps={[makeStep({ onDescriptionTooltipPress: jest.fn() })]}
          currentStep={0}
        />,
      );
      expect(getByLabelText('More information')).toBeOnTheScreen();
    });

    it('uses the default accessibilityLabel when none is provided', () => {
      const { getByLabelText } = render(
        <StepperCard
          steps={[makeStep({ onDescriptionTooltipPress: jest.fn() })]}
          currentStep={0}
        />,
      );
      expect(getByLabelText('More information')).toBeOnTheScreen();
    });

    it('uses custom descriptionTooltipAccessibilityLabel when provided', () => {
      const { getByLabelText } = render(
        <StepperCard
          steps={[
            makeStep({
              onDescriptionTooltipPress: jest.fn(),
              descriptionTooltipAccessibilityLabel: 'APY information',
            }),
          ]}
          currentStep={0}
        />,
      );
      expect(getByLabelText('APY information')).toBeOnTheScreen();
    });

    it('fires onDescriptionTooltipPress when tooltip icon is pressed', () => {
      const onTooltipPress = jest.fn();
      const { getByLabelText } = render(
        <StepperCard
          steps={[makeStep({ onDescriptionTooltipPress: onTooltipPress })]}
          currentStep={0}
        />,
      );
      fireEvent.press(getByLabelText('More information'));
      expect(onTooltipPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('glass', () => {
    const stepWithSkip = () =>
      makeStep({ secondaryCta: { text: 'Skip', onPress: jest.fn() } });

    it('keeps the opaque card and secondary button by default', () => {
      const { queryAllByTestId } = render(
        <StepperCard steps={[stepWithSkip()]} currentStep={0} testID="card" />,
      );

      expect(queryAllByTestId(GLASS_SURFACE_SHEEN_TEST_ID)).toHaveLength(0);
    });

    it('draws the card and its secondary button on glass', () => {
      const step = stepWithSkip();
      const { getAllByTestId, getByTestId, getByText } = render(
        <StepperCard steps={[step]} currentStep={0} testID="card" isGlass />,
      );

      // One sheen for the card, one for the Skip button.
      expect(getAllByTestId(GLASS_SURFACE_SHEEN_TEST_ID)).toHaveLength(2);
      expect(getByTestId('card-container')).toBeOnTheScreen();

      fireEvent.press(getByText('Skip'));

      expect(step.secondaryCta?.onPress).toHaveBeenCalledTimes(1);
    });

    it('draws the primary button as tinted glass and keeps it pressable', () => {
      const step = makeStep();
      const { UNSAFE_getAllByType, getByTestId } = render(
        <StepperCard steps={[step]} currentStep={0} testID="card" isGlass />,
      );

      // The card's glass, then the primary button's.
      const [, primaryGlass] = UNSAFE_getAllByType(GlassView);
      expect(primaryGlass.props.tintColor).toBe(mockTheme.colors.icon.default);

      fireEvent.press(getByTestId('card-cta-button'));

      expect(step.primaryCta.onPress).toHaveBeenCalledTimes(1);
    });

    it('keeps the primary button off glass by default', () => {
      const { UNSAFE_queryAllByType } = render(
        <StepperCard steps={[makeStep()]} currentStep={0} testID="card" />,
      );

      expect(UNSAFE_queryAllByType(GlassView)).toHaveLength(0);
    });
  });
});
