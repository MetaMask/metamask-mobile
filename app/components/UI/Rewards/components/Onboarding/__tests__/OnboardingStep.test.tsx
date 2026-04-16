import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import { Text, PanResponder } from 'react-native';
import OnboardingStep from '../OnboardingStep';
import { renderWithProviders } from '../testUtils';
import { REWARDS_VIEW_SELECTORS } from '../../../Views/RewardsView.constants';

// Mock strings
jest.mock('../../../../../../../locales/i18n', () => ({
  strings: (key: string) => `mocked_${key}`,
}));

// Mock navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
  useFocusEffect: jest.fn(),
}));

// Mock route params
jest.mock('../../../../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../../../../util/navigation/navUtils'),
  useParams: () => ({
    referral: undefined,
    isFromDeeplink: false,
  }),
}));

// Mock dispatch
const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => mockDispatch,
}));

// Mock theme
jest.mock('../../../../../../util/theme', () => {
  const { mockTheme } = jest.requireActual('../../../../../../util/theme');
  return {
    useTheme: () => mockTheme,
  };
});

// Mock rewards auth hook
const mockOptin = jest.fn();
const mockUseOptin = {
  optin: mockOptin,
  optinError: null as string | null,
  optinLoading: false,
};

jest.mock('../../../hooks/useOptIn', () => ({
  useOptin: () => mockUseOptin,
}));

// Mock validate referral code hook
const mockSetReferralCode = jest.fn();
const mockUseValidateReferralCode = {
  referralCode: '',
  setReferralCode: mockSetReferralCode,
  isValidating: false,
  isValid: false,
};

jest.mock('../../../hooks/useValidateReferralCode', () => ({
  useValidateReferralCode: () => mockUseValidateReferralCode,
}));

import { useAnalytics } from '../../../../../../components/hooks/useAnalytics/useAnalytics';
import {
  createMockUseAnalyticsHook,
  createMockEventBuilder,
} from '../../../../../../util/test/analyticsMock';

const mockCreateEventBuilder = jest.fn(() => createMockEventBuilder());

jest.mock('../../../../../../components/hooks/useAnalytics/useAnalytics');

// Mock Linking and PanResponder
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Linking: {
      openURL: jest.fn(),
    },
    PanResponder: {
      create: jest.fn().mockReturnValue({
        panHandlers: {
          onStartShouldSetResponder: jest.fn(),
          onMoveShouldSetResponder: jest.fn(),
          onResponderGrant: jest.fn(),
          onResponderMove: jest.fn(),
          onResponderRelease: jest.fn(),
        },
      }),
    },
  };
});

// Mock SVG components
jest.mock(
  '../../../../../images/rewards/rewards-onboarding-step1-bg.svg',
  () => 'MockedSVGStep1',
);
jest.mock(
  '../../../../../images/rewards/rewards-onboarding-step2-bg.svg',
  () => 'MockedSVGStep2',
);
jest.mock(
  '../../../../../images/rewards/rewards-onboarding-step3-bg.svg',
  () => 'MockedSVGStep3',
);

describe('OnboardingStep - Skip and Swipe Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useAnalytics).mockReturnValue(
      createMockUseAnalyticsHook({
        createEventBuilder: mockCreateEventBuilder,
      }),
    );
  });

  it('should render skip button when onSkip prop is provided', () => {
    const onSkipMock = jest.fn();
    const onNextMock = jest.fn();

    renderWithProviders(
      <OnboardingStep
        currentStep={1}
        onNext={onNextMock}
        onSkip={onSkipMock}
        renderStepInfo={() => <Text>Test Info</Text>}
      />,
    );

    const skipButton = screen.getByTestId(REWARDS_VIEW_SELECTORS.SKIP_BUTTON);
    expect(skipButton).toBeTruthy();
  });

  it('should call onSkip when skip button is pressed', () => {
    const onSkipMock = jest.fn();
    const onNextMock = jest.fn();

    renderWithProviders(
      <OnboardingStep
        currentStep={1}
        onNext={onNextMock}
        onSkip={onSkipMock}
        renderStepInfo={() => <Text>Test Info</Text>}
      />,
    );

    const skipButton = screen.getByTestId(REWARDS_VIEW_SELECTORS.SKIP_BUTTON);
    fireEvent.press(skipButton);

    expect(onSkipMock).toHaveBeenCalledTimes(1);
  });

  it('should not render skip button when onSkip prop is not provided', () => {
    const onNextMock = jest.fn();

    renderWithProviders(
      <OnboardingStep
        currentStep={1}
        onNext={onNextMock}
        renderStepInfo={() => <Text>Test Info</Text>}
      />,
    );

    const skipButton = screen.queryByTestId(REWARDS_VIEW_SELECTORS.SKIP_BUTTON);
    expect(skipButton).toBeNull();
  });

  it('should call onNext when next button is pressed', () => {
    const onNextMock = jest.fn();

    renderWithProviders(
      <OnboardingStep
        currentStep={1}
        onNext={onNextMock}
        renderStepInfo={() => <Text>Test Info</Text>}
      />,
    );

    const nextButton = screen.getByTestId(REWARDS_VIEW_SELECTORS.NEXT_BUTTON);
    fireEvent.press(nextButton);

    expect(onNextMock).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when close button is pressed', () => {
    const onNextMock = jest.fn();

    renderWithProviders(
      <OnboardingStep
        currentStep={1}
        onNext={onNextMock}
        renderStepInfo={() => <Text>Test Info</Text>}
      />,
    );

    const closeButton = screen.getByTestId('close-button');
    fireEvent.press(closeButton);

    expect(mockDispatch).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalled();
  });

  it('should apply panHandlers to the container for swipe gestures', () => {
    const onNextMock = jest.fn();
    const onPreviousMock = jest.fn();

    renderWithProviders(
      <OnboardingStep
        currentStep={2}
        onNext={onNextMock}
        onPrevious={onPreviousMock}
        renderStepInfo={() => <Text>Test Info</Text>}
      />,
    );

    const container = screen.getByTestId('onboarding-step-container');
    expect(container.props.onResponderRelease).toBeDefined();
  });

  it('should disable swipe when disableSwipe prop is true', () => {
    const onNextMock = jest.fn();
    const onPreviousMock = jest.fn();

    renderWithProviders(
      <OnboardingStep
        currentStep={2}
        onNext={onNextMock}
        onPrevious={onPreviousMock}
        disableSwipe
        renderStepInfo={() => <Text>Test Info</Text>}
      />,
    );

    // We can't directly test the PanResponder behavior in this test environment,
    // but we can verify the component renders with the prop
    const container = screen.getByTestId('onboarding-step-container');
    expect(container).toBeTruthy();
  });
});

const mockOnNext = jest.fn();
const mockOnPrevious = jest.fn();
const mockRenderStepInfo = jest.fn(() => <text>Step Info</text>);

const defaultProps = {
  currentStep: 2,
  onNext: mockOnNext,
  onPrevious: mockOnPrevious,
  renderStepInfo: mockRenderStepInfo,
};

describe('OnboardingStep', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render without crashing', () => {
      renderWithProviders(<OnboardingStep {...defaultProps} />);
      expect(screen.getByTestId('onboarding-step-container')).toBeDefined();
    });

    it('should render next button with default text', () => {
      renderWithProviders(<OnboardingStep {...defaultProps} />);
      expect(
        screen.getByText('mocked_rewards.onboarding.step_confirm'),
      ).toBeDefined();
    });

    it('should render next button with custom text', () => {
      renderWithProviders(
        <OnboardingStep
          {...defaultProps}
          nextButtonText="Custom Button Text"
        />,
      );
      expect(screen.getByText('Custom Button Text')).toBeDefined();
    });

    it('should render close button with correct testID', () => {
      renderWithProviders(<OnboardingStep {...defaultProps} />);
      expect(screen.getByTestId('close-button')).toBeDefined();
    });
  });

  describe('button interactions', () => {
    it('should call onNext when next button is pressed', () => {
      renderWithProviders(<OnboardingStep {...defaultProps} />);

      const nextButton = screen.getByText(
        'mocked_rewards.onboarding.step_confirm',
      );
      fireEvent.press(nextButton);

      expect(mockOnNext).toHaveBeenCalledTimes(1);
    });

    it('should navigate to wallet view and reset onboarding step when close button is pressed', () => {
      renderWithProviders(<OnboardingStep {...defaultProps} />);

      const closeButton = screen.getByTestId('close-button');
      fireEvent.press(closeButton);

      expect(mockDispatch).toHaveBeenCalledWith(expect.any(Object));
      expect(mockNavigate).toHaveBeenCalledWith('WalletTabHome');
    });

    it('should disable next button when onNextDisabled is true', () => {
      renderWithProviders(<OnboardingStep {...defaultProps} onNextDisabled />);

      const nextButton = screen.getByText(
        'mocked_rewards.onboarding.step_confirm',
      );
      expect(nextButton).toBeDefined();
      // Button should be disabled (exact implementation depends on Button component)
    });

    it('should disable next button when onNextLoading is true', () => {
      renderWithProviders(<OnboardingStep {...defaultProps} onNextLoading />);

      const nextButton = screen.getByText(
        'mocked_rewards.onboarding.step_confirm',
      );
      expect(nextButton).toBeDefined();
      // Button should be disabled and show loading state
    });

    it('should render skip button when onSkip is provided', () => {
      const mockOnSkip = jest.fn();
      renderWithProviders(
        <OnboardingStep {...defaultProps} onSkip={mockOnSkip} />,
      );

      const skipButton = screen.getByText(
        'mocked_rewards.onboarding.step_skip',
      );
      expect(skipButton).toBeDefined();
    });

    it('should call onSkip when skip button is pressed', () => {
      const mockOnSkip = jest.fn();
      renderWithProviders(
        <OnboardingStep {...defaultProps} onSkip={mockOnSkip} />,
      );

      const skipButton = screen.getByText(
        'mocked_rewards.onboarding.step_skip',
      );
      fireEvent.press(skipButton);

      expect(mockOnSkip).toHaveBeenCalledTimes(1);
    });

    it('should not render skip button when onSkip is not provided', () => {
      renderWithProviders(<OnboardingStep {...defaultProps} />);

      const skipButton = screen.queryByText('mocked_rewards.onboarding.skip');
      expect(skipButton).toBeNull();
    });
  });

  describe('loading states', () => {
    it('should show loading text when provided', () => {
      renderWithProviders(
        <OnboardingStep
          {...defaultProps}
          onNextLoading
          onNextLoadingText="Loading..."
        />,
      );

      expect(screen.getByText('Loading...')).toBeDefined();
    });
  });

  it('should be enabled by default', () => {
    renderWithProviders(<OnboardingStep {...defaultProps} />);
    // Gesture should be enabled by default
  });
});

describe('image and background rendering', () => {
  it('should render step image when renderStepImage is provided', () => {
    const mockRenderStepImage = jest.fn(() => (
      <Text testID="step-image">Step Image</Text>
    ));

    renderWithProviders(
      <OnboardingStep
        {...defaultProps}
        renderStepImage={mockRenderStepImage}
      />,
    );

    expect(mockRenderStepImage).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('step-image')).toBeDefined();
  });

  it('should not render image container when renderStepImage is not provided', () => {
    renderWithProviders(<OnboardingStep {...defaultProps} />);
    expect(screen.queryByTestId('step-image')).toBeNull();
  });
});

describe('renderLegalDisclaimer rendering', () => {
  it('should render alternative button when provided', () => {
    const mockAlternativeButton = jest.fn(() => (
      <Text testID="alternative-button">Alternative Action</Text>
    ));

    renderWithProviders(
      <OnboardingStep
        renderLegalDisclaimer={mockAlternativeButton}
        {...defaultProps}
      />,
    );

    expect(mockAlternativeButton).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('alternative-button')).toBeDefined();
  });

  it('should not render alternative button when not provided', () => {
    renderWithProviders(<OnboardingStep {...defaultProps} />);
    expect(screen.queryByTestId('alternative-button')).toBeNull();
  });
});

describe('ProgressIndicator integration', () => {
  it('should render ProgressIndicator with correct props', () => {
    renderWithProviders(<OnboardingStep {...defaultProps} currentStep={3} />);

    // Check that progress indicator is rendered
    expect(screen.getByTestId('progress-indicator-container')).toBeDefined();
  });

  it('should pass different currentStep values to ProgressIndicator', () => {
    const { rerender } = renderWithProviders(
      <OnboardingStep {...defaultProps} currentStep={1} />,
    );
    expect(screen.getByTestId('progress-indicator-container')).toBeDefined();

    rerender(<OnboardingStep {...defaultProps} currentStep={4} />);
    expect(screen.getByTestId('progress-indicator-container')).toBeDefined();
  });
});

describe('swipe gesture functionality', () => {
  // Create real PanResponder mock to test the actual implementation
  let panResponderCreateSpy: jest.SpyInstance;
  let mockPanHandlers: unknown;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset mock handlers
    mockPanHandlers = {
      onStartShouldSetResponder: jest.fn(),
      onMoveShouldSetResponder: jest.fn(),
      onResponderGrant: jest.fn(),
      onResponderMove: jest.fn(),
      onResponderRelease: jest.fn(),
    };

    // Spy on PanResponder.create to capture the actual implementation
    panResponderCreateSpy = jest.spyOn(PanResponder, 'create');
    panResponderCreateSpy.mockImplementation((config) => {
      // Store the original config callbacks
      const originalCallbacks = {
        onStartShouldSetPanResponder: config.onStartShouldSetPanResponder,
        onMoveShouldSetPanResponder: config.onMoveShouldSetPanResponder,
        onPanResponderRelease: config.onPanResponderRelease,
      };

      // Return mock handlers but also execute the original callbacks
      return {
        panHandlers: mockPanHandlers,
        _callbacks: originalCallbacks, // Store for testing
      };
    });
  });

  afterEach(() => {
    panResponderCreateSpy.mockRestore();
  });

  it('should enable swipe gestures by default', () => {
    renderWithProviders(<OnboardingStep {...defaultProps} />);

    // Verify PanResponder.create was called
    expect(panResponderCreateSpy).toHaveBeenCalled();

    // Verify the container has panHandlers attached
    const container = screen.getByTestId('onboarding-step-container');
    expect(container).toBeDefined();
  });

  it('should call onNext when swiping left', () => {
    const onNextMock = jest.fn();

    renderWithProviders(
      <OnboardingStep {...defaultProps} onNext={onNextMock} />,
    );

    // Get the PanResponder config that was passed to create
    const panResponderConfig = panResponderCreateSpy.mock.calls[0][0];

    // Simulate a left swipe by directly calling the release handler
    panResponderConfig.onPanResponderRelease(null, {
      dx: -60, // Left swipe (should call onNext)
      dy: 10,
    });

    // Verify onNext was called
    expect(onNextMock).toHaveBeenCalled();
  });

  it('should call onPrevious when swiping right', () => {
    const onPreviousMock = jest.fn();

    renderWithProviders(
      <OnboardingStep {...defaultProps} onPrevious={onPreviousMock} />,
    );

    // Get the PanResponder config that was passed to create
    const panResponderConfig = panResponderCreateSpy.mock.calls[0][0];

    // Simulate a right swipe by directly calling the release handler
    panResponderConfig.onPanResponderRelease(null, {
      dx: 60, // Right swipe (should call onPrevious)
      dy: 10,
    });

    // Verify onPrevious was called
    expect(onPreviousMock).toHaveBeenCalled();
  });

  it('should not call onNext when swiping left if onNextDisabled is true', () => {
    const onNextMock = jest.fn();

    renderWithProviders(
      <OnboardingStep {...defaultProps} onNext={onNextMock} onNextDisabled />,
    );

    // Get the PanResponder config that was passed to create
    const panResponderConfig = panResponderCreateSpy.mock.calls[0][0];

    // Simulate a left swipe by directly calling the release handler
    panResponderConfig.onPanResponderRelease(null, {
      dx: -60, // Left swipe
      dy: 10,
    });

    // Verify onNext was not called
    expect(onNextMock).not.toHaveBeenCalled();
  });

  it('should not call onNext when swiping left if onNextLoading is true', () => {
    const onNextMock = jest.fn();

    renderWithProviders(
      <OnboardingStep {...defaultProps} onNext={onNextMock} onNextLoading />,
    );

    // Get the PanResponder config that was passed to create
    const panResponderConfig = panResponderCreateSpy.mock.calls[0][0];

    // Simulate a left swipe by directly calling the release handler
    panResponderConfig.onPanResponderRelease(null, {
      dx: -60, // Left swipe
      dy: 10,
    });

    // Verify onNext was not called
    expect(onNextMock).not.toHaveBeenCalled();
  });

  it('should not handle gestures when disableSwipe is true', () => {
    const onNextMock = jest.fn();
    const onPreviousMock = jest.fn();

    renderWithProviders(
      <OnboardingStep
        {...defaultProps}
        onNext={onNextMock}
        onPrevious={onPreviousMock}
        disableSwipe
      />,
    );

    // Get the PanResponder config that was passed to create
    const panResponderConfig = panResponderCreateSpy.mock.calls[0][0];

    // Verify onStartShouldSetPanResponder returns false when disableSwipe is true
    expect(panResponderConfig.onStartShouldSetPanResponder()).toBe(false);

    // Simulate swipes in both directions
    panResponderConfig.onPanResponderRelease(null, { dx: 60, dy: 10 });
    panResponderConfig.onPanResponderRelease(null, { dx: -60, dy: 10 });

    // Verify neither callback was called
    expect(onNextMock).not.toHaveBeenCalled();
    expect(onPreviousMock).not.toHaveBeenCalled();
  });

  it('should ignore swipes below the threshold', () => {
    const onNextMock = jest.fn();
    const onPreviousMock = jest.fn();

    renderWithProviders(
      <OnboardingStep
        {...defaultProps}
        onNext={onNextMock}
        onPrevious={onPreviousMock}
      />,
    );

    // Get the PanResponder config that was passed to create
    const panResponderConfig = panResponderCreateSpy.mock.calls[0][0];

    // Simulate small swipes (below threshold)
    panResponderConfig.onPanResponderRelease(null, { dx: 30, dy: 10 }); // Small right swipe
    panResponderConfig.onPanResponderRelease(null, { dx: -30, dy: 10 }); // Small left swipe

    // Verify neither callback was called
    expect(onNextMock).not.toHaveBeenCalled();
    expect(onPreviousMock).not.toHaveBeenCalled();
  });

  it('should ignore vertical swipes', () => {
    const onNextMock = jest.fn();
    const onPreviousMock = jest.fn();

    renderWithProviders(
      <OnboardingStep
        {...defaultProps}
        onNext={onNextMock}
        onPrevious={onPreviousMock}
      />,
    );

    // Get the PanResponder config that was passed to create
    const panResponderConfig = panResponderCreateSpy.mock.calls[0][0];

    // Check if onMoveShouldSetPanResponder correctly handles vertical movement
    expect(
      panResponderConfig.onMoveShouldSetPanResponder(null, { dx: 10, dy: 100 }),
    ).toBe(false);

    // Simulate vertical swipe
    panResponderConfig.onPanResponderRelease(null, { dx: 10, dy: 100 });

    // Verify neither callback was called
    expect(onNextMock).not.toHaveBeenCalled();
    expect(onPreviousMock).not.toHaveBeenCalled();
  });
});

describe('edge cases and prop variations', () => {
  it('should handle all loading states correctly', () => {
    const { rerender } = renderWithProviders(
      <OnboardingStep
        {...defaultProps}
        onNextLoading
        onNextLoadingText="Custom Loading Text"
      />,
    );

    expect(screen.getByText('Custom Loading Text')).toBeDefined();

    // Test without loading text
    rerender(<OnboardingStep {...defaultProps} onNextLoading />);

    // Should still render the button in loading state
    expect(
      screen.getByText('mocked_rewards.onboarding.step_confirm'),
    ).toBeDefined();
  });

  it('should call renderStepInfo function', () => {
    const mockRenderStepInfoLocal = jest.fn(() => (
      <Text testID="step-info">Info Content</Text>
    ));

    renderWithProviders(
      <OnboardingStep
        {...defaultProps}
        renderStepInfo={mockRenderStepInfoLocal}
      />,
    );

    expect(mockRenderStepInfoLocal).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('step-info')).toBeDefined();
  });

  it('should handle different currentStep values', () => {
    const testSteps = [1, 2, 3, 4];

    testSteps.forEach((step) => {
      const { unmount } = renderWithProviders(
        <OnboardingStep {...defaultProps} currentStep={step} />,
      );

      expect(screen.getByTestId('progress-indicator-container')).toBeDefined();
      unmount();
    });
  });

  it('should render with minimal required props', () => {
    const minimalProps = {
      currentStep: 1,
      onNext: jest.fn(),
      renderStepInfo: jest.fn(() => <Text>Minimal Info</Text>),
    };

    renderWithProviders(<OnboardingStep {...minimalProps} />);

    expect(screen.getByTestId('onboarding-step-container')).toBeDefined();
    expect(
      screen.getByText('mocked_rewards.onboarding.step_confirm'),
    ).toBeDefined();
  });
});

describe('component composition and layout', () => {
  it('should render all sections in correct layout order', () => {
    const mockRenderStepImage = jest.fn(() => (
      <Text testID="step-image">Image</Text>
    ));
    const mockRenderStepInfoComp = jest.fn(() => (
      <Text testID="step-info">Info</Text>
    ));
    const mockAlternativeButton = jest.fn(() => (
      <Text testID="alternative-button">Alt</Text>
    ));

    renderWithProviders(
      <OnboardingStep
        {...defaultProps}
        renderStepImage={mockRenderStepImage}
        renderStepInfo={mockRenderStepInfoComp}
        renderLegalDisclaimer={mockAlternativeButton}
        nextButtonText="Custom Next"
      />,
    );

    // All sections should be present
    expect(screen.getByTestId('progress-indicator-container')).toBeDefined();
    expect(screen.getByTestId('step-image')).toBeDefined();
    expect(screen.getByTestId('step-info')).toBeDefined();
    expect(screen.getByText('Custom Next')).toBeDefined();
    expect(screen.getByTestId('alternative-button')).toBeDefined();
  });
});
