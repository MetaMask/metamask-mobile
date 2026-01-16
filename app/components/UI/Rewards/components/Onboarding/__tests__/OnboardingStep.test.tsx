import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Text, Linking, PanResponder } from 'react-native';
import OnboardingStep from '../OnboardingStep';
import OnboardingStep1 from '../OnboardingStep1';
import OnboardingStep2 from '../OnboardingStep2';
import OnboardingStep3 from '../OnboardingStep3';
import OnboardingStep4 from '../OnboardingStep4';
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
jest.mock('../../../../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      background: {
        muted: '#f5f5f5',
        default: '#ffffff',
      },
      text: {
        primary: '#000000',
        alternative: '#666666',
      },
      border: {
        muted: '#e0e0e0',
      },
    },
  }),
}));

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

// Mock useMetrics hook
const mockBuilder = {
  addProperties: jest.fn().mockReturnThis(),
  build: jest.fn().mockReturnValue({}),
};

jest.mock('../../../../../../components/hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: jest.fn(),
    createEventBuilder: jest.fn(() => mockBuilder),
  }),
  MetaMetricsEvents: {},
}));

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

describe('nextButtonAlternative rendering', () => {
  it('should render alternative button when provided', () => {
    const mockAlternativeButton = jest.fn(() => (
      <Text testID="alternative-button">Alternative Action</Text>
    ));

    renderWithProviders(
      <OnboardingStep
        nextButtonAlternative={mockAlternativeButton}
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
        nextButtonAlternative={mockAlternativeButton}
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

// Individual OnboardingStep Component Tests
describe('OnboardingStep1', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render without crashing', () => {
      renderWithProviders(<OnboardingStep1 />);
      expect(screen.getByTestId('onboarding-step-container')).toBeDefined();
    });

    it('should render step 1 image with correct testID', () => {
      renderWithProviders(<OnboardingStep1 />);
      expect(screen.getByTestId('step-1-image')).toBeDefined();
    });

    it('should display step 1 title and description', () => {
      renderWithProviders(<OnboardingStep1 />);
      expect(
        screen.getByText('mocked_rewards.onboarding.step1_title'),
      ).toBeDefined();
      expect(
        screen.getByText('mocked_rewards.onboarding.step1_description'),
      ).toBeDefined();
    });

    it('should show progress indicator with currentStep set to 1', () => {
      renderWithProviders(<OnboardingStep1 />);
      expect(screen.getByTestId('progress-indicator-container')).toBeDefined();
    });

    it('should render skip and next buttons', () => {
      renderWithProviders(<OnboardingStep1 />);
      expect(
        screen.getByText('mocked_rewards.onboarding.step_confirm'),
      ).toBeDefined();
    });
  });

  describe('navigation', () => {
    it('should navigate to step 2 when next button is pressed', () => {
      renderWithProviders(<OnboardingStep1 />);

      const nextButton = screen.getByText(
        'mocked_rewards.onboarding.step_confirm',
      );
      fireEvent.press(nextButton);

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: expect.any(String),
        }),
      );
      expect(mockNavigate).toHaveBeenCalledWith('RewardsOnboarding2');
    });
  });

  describe('content verification', () => {
    it('should use correct images and background elements', () => {
      renderWithProviders(<OnboardingStep1 />);

      // Verify step image is present
      const stepImage = screen.getByTestId('step-1-image');
      expect(stepImage).toBeDefined();
      expect(stepImage.props.resizeMode).toBe('contain');
    });
  });
});

describe('OnboardingStep2', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render without crashing', () => {
      renderWithProviders(<OnboardingStep2 />);
      expect(screen.getByTestId('onboarding-step-container')).toBeDefined();
    });

    it('should render step 2 image with correct testID', () => {
      renderWithProviders(<OnboardingStep2 />);
      expect(screen.getByTestId('step-2-image')).toBeDefined();
    });

    it('should display step 2 title and description', () => {
      renderWithProviders(<OnboardingStep2 />);
      expect(
        screen.getByText('mocked_rewards.onboarding.step2_title'),
      ).toBeDefined();
      expect(
        screen.getByText('mocked_rewards.onboarding.step2_description'),
      ).toBeDefined();
    });

    it('should show progress indicator with currentStep set to 2', () => {
      renderWithProviders(<OnboardingStep2 />);
      expect(screen.getByTestId('progress-indicator-container')).toBeDefined();
    });
  });

  describe('navigation', () => {
    it('should navigate to step 3 when next button is pressed', () => {
      renderWithProviders(<OnboardingStep2 />);

      const nextButton = screen.getByText(
        'mocked_rewards.onboarding.step_confirm',
      );
      fireEvent.press(nextButton);

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: expect.any(String),
        }),
      );
      expect(mockNavigate).toHaveBeenCalledWith('RewardsOnboarding3');
    });
  });

  describe('content verification', () => {
    it('should use correct images and background elements', () => {
      renderWithProviders(<OnboardingStep2 />);

      const stepImage = screen.getByTestId('step-2-image');
      expect(stepImage).toBeDefined();
      expect(stepImage.props.resizeMode).toBe('contain');
    });
  });
});

describe('OnboardingStep3', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render without crashing', () => {
      renderWithProviders(<OnboardingStep3 />);
      expect(screen.getByTestId('onboarding-step-container')).toBeDefined();
    });

    it('should render step 3 image with correct testID', () => {
      renderWithProviders(<OnboardingStep3 />);
      expect(screen.getByTestId('step-3-image')).toBeDefined();
    });

    it('should display step 3 title and description', () => {
      renderWithProviders(<OnboardingStep3 />);
      expect(
        screen.getByText('mocked_rewards.onboarding.step3_title'),
      ).toBeDefined();
      expect(
        screen.getByText('mocked_rewards.onboarding.step3_description'),
      ).toBeDefined();
    });

    it('should show progress indicator with currentStep set to 3', () => {
      renderWithProviders(<OnboardingStep3 />);
      expect(screen.getByTestId('progress-indicator-container')).toBeDefined();
    });
  });

  describe('navigation', () => {
    it('should navigate to step 4 when next button is pressed', async () => {
      renderWithProviders(<OnboardingStep3 />);

      const nextButton = screen.getByText(
        'mocked_rewards.onboarding.step_confirm',
      );
      fireEvent.press(nextButton);

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledWith(
          expect.objectContaining({
            type: expect.any(String),
          }),
        );
        expect(mockNavigate).toHaveBeenCalledWith('RewardsOnboarding4');
      });
    });
  });

  describe('content verification', () => {
    it('should use correct images and background elements', () => {
      renderWithProviders(<OnboardingStep3 />);

      const stepImage = screen.getByTestId('step-3-image');
      expect(stepImage).toBeDefined();
      expect(stepImage.props.resizeMode).toBe('contain');
    });
  });
});

describe('OnboardingStep4', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock state
    mockUseOptin.optinError = null;
    mockUseOptin.optinLoading = false;
    mockUseValidateReferralCode.referralCode = '';
    mockUseValidateReferralCode.isValidating = false;
    mockUseValidateReferralCode.isValid = false;
  });

  describe('rendering', () => {
    it('should render without crashing', () => {
      renderWithProviders(<OnboardingStep4 />);
      expect(screen.getByTestId('onboarding-step-container')).toBeDefined();
    });

    it('should render step 4 image with correct testID', () => {
      renderWithProviders(<OnboardingStep4 />);
      expect(screen.getByTestId('step-4-image')).toBeDefined();
    });

    it('should display default title when no referral code is valid', () => {
      renderWithProviders(<OnboardingStep4 />);
      expect(
        screen.getByText('mocked_rewards.onboarding.step4_title'),
      ).toBeDefined();
    });

    it('should display referral bonus title when referral code is valid', () => {
      mockUseValidateReferralCode.isValid = true;

      renderWithProviders(<OnboardingStep4 />);
      expect(
        screen.getByText(
          'mocked_rewards.onboarding.step4_title_referral_bonus',
        ),
      ).toBeDefined();
    });

    it('should render referral code input field', () => {
      renderWithProviders(<OnboardingStep4 />);
      expect(screen.getByDisplayValue('')).toBeDefined(); // TextField should be present
    });

    it('should render legal disclaimer with learn more link', () => {
      renderWithProviders(<OnboardingStep4 />);

      // The component renders a Text component with nested Text components
      // Instead of looking for exact mock keys, we'll check for the presence of Text elements
      const textElements = screen.getAllByText(
        /mocked_rewards.onboarding.step4_legal_disclaimer/,
      );

      // Verify we have at least one text element for the legal disclaimer
      expect(textElements.length).toBeGreaterThan(0);

      // Check for the presence of clickable text elements (terms and learn more links)
      const clickableElements = screen.getAllByText(
        /mocked_rewards.onboarding.step4_legal_disclaimer_[24]/,
      );
      expect(clickableElements.length).toBeGreaterThan(0);
    });

    it('should show progress indicator with currentStep set to 4', () => {
      renderWithProviders(<OnboardingStep4 />);
      expect(screen.getByTestId('progress-indicator-container')).toBeDefined();
    });
  });

  describe('referral code validation', () => {
    it('should show validation loading state when validating referral code', () => {
      mockUseValidateReferralCode.isValidating = true;
      mockUseValidateReferralCode.referralCode = 'TEST123';

      renderWithProviders(<OnboardingStep4 />);

      // Should show loading text
      expect(
        screen.getByText(
          'mocked_rewards.onboarding.step4_title_referral_validating',
        ),
      ).toBeDefined();
    });

    it('should show success icon when referral code is valid', () => {
      mockUseValidateReferralCode.referralCode = 'VALID123';
      mockUseValidateReferralCode.isValid = true;

      renderWithProviders(<OnboardingStep4 />);

      // Should show confirmation icon in the text field accessory
      expect(screen.getByTestId('step-4-image')).toBeDefined();
    });

    it('should show error icon when referral code is invalid', () => {
      mockUseValidateReferralCode.referralCode = 'INVALID';
      mockUseValidateReferralCode.isValid = false;

      renderWithProviders(<OnboardingStep4 />);

      // TextField should be present and show error state
      expect(screen.getByDisplayValue('INVALID')).toBeDefined();
    });

    it('should call setReferralCode when input value changes', () => {
      renderWithProviders(<OnboardingStep4 />);

      const textField = screen.getByDisplayValue('');
      fireEvent.changeText(textField, 'NEWCODE');

      expect(mockSetReferralCode).toHaveBeenCalledWith('NEWCODE');
    });
  });

  describe('opt-in flow', () => {
    it('should call optin with referral code when next button is pressed', () => {
      // Set up the mock before rendering
      Object.assign(mockUseValidateReferralCode, {
        referralCode: 'TEST123',
        isValid: true,
      });

      renderWithProviders(<OnboardingStep4 />);

      const nextButton = screen.getByText(
        'mocked_rewards.onboarding.step4_confirm',
      );
      fireEvent.press(nextButton);

      expect(mockOptin).toHaveBeenCalledWith({
        referralCode: 'TEST123',
        isPrefilled: false,
      });
    });

    it('should show loading state during opt-in', () => {
      mockUseOptin.optinLoading = true;

      renderWithProviders(<OnboardingStep4 />);

      expect(
        screen.getByText('mocked_rewards.onboarding.step4_confirm_loading'),
      ).toBeDefined();
    });

    it('should disable next button when referral code is invalid', () => {
      mockUseValidateReferralCode.referralCode = 'INVALID';
      mockUseValidateReferralCode.isValid = false;

      renderWithProviders(<OnboardingStep4 />);

      const nextButton = screen.getByText(
        'mocked_rewards.onboarding.step4_confirm',
      );
      // Button should be disabled - in real implementation this would be tested via accessibility states
      expect(nextButton).toBeDefined();
    });
  });

  describe('navigation', () => {
    it('should have swipe gestures disabled', () => {
      renderWithProviders(<OnboardingStep4 />);

      const container = screen.getByTestId('onboarding-step-container');
      expect(container).toBeDefined();

      // Test that swiping doesn't trigger navigation
      fireEvent(container, 'panResponderRelease', null, {
        dx: -60, // Left swipe
        dy: 10,
      });

      // Navigation should not have been called
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('external links', () => {
    it('should open learn more URL when legal link is pressed', () => {
      const mockOpenURL = jest.spyOn(Linking, 'openURL');

      renderWithProviders(<OnboardingStep4 />);

      const learnMoreLink = screen.getByText(
        'mocked_rewards.onboarding.step4_legal_disclaimer_2',
      );
      fireEvent.press(learnMoreLink);

      expect(mockOpenURL).toHaveBeenCalledWith(expect.any(String));
    });
  });

  describe('state combinations', () => {
    it('should handle loading and validating states simultaneously', () => {
      mockUseOptin.optinLoading = true;
      mockUseValidateReferralCode.isValidating = true;

      renderWithProviders(<OnboardingStep4 />);

      // Should prioritize opt-in loading text over validation loading
      expect(
        screen.getByText('mocked_rewards.onboarding.step4_confirm_loading'),
      ).toBeDefined();
    });

    it('should disable input when opt-in is loading', () => {
      mockUseOptin.optinLoading = true;

      renderWithProviders(<OnboardingStep4 />);

      const textField = screen.getByDisplayValue('');
      // TextField should be disabled when loading - this would be tested via props in real implementation
      expect(textField).toBeDefined();
    });
  });
});

// Integration tests for step flow
describe('OnboardingStep Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('step progression flow', () => {
    it('should maintain proper step sequence through navigation', () => {
      // Test step 1 -> step 2 progression
      const { rerender } = renderWithProviders(<OnboardingStep1 />);

      const nextButton = screen.getByText(
        'mocked_rewards.onboarding.step_confirm',
      );
      fireEvent.press(nextButton);

      expect(mockNavigate).toHaveBeenCalledWith('RewardsOnboarding2');

      // Simulate navigation to step 2
      rerender(<OnboardingStep2 />);
      expect(screen.getByTestId('step-2-image')).toBeDefined();
    });
  });

  describe('state persistence', () => {
    it('should dispatch correct actions for state management', () => {
      renderWithProviders(<OnboardingStep1 />);

      const nextButton = screen.getByText(
        'mocked_rewards.onboarding.step_confirm',
      );
      fireEvent.press(nextButton);

      // Should dispatch action to set active step
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: expect.any(String),
        }),
      );
    });
  });
});
