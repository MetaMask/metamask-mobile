import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import CampaignTourStepView from './CampaignTourStepView';
import Routes from '../../../../constants/navigation/Routes';
import { CAMPAIGN_TOUR_STEP_TEST_IDS } from '../components/Campaigns/tour/CampaignTourStep';
import {
  type CampaignDto,
  CampaignType,
} from '../../../../core/Engine/controllers/rewards-controller/types';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
  useRoute: () => ({
    params: { campaignId: 'campaign-1' },
  }),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  return { ...actual };
});

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({ style: (...args: unknown[]) => args }),
}));

jest.mock(
  '../components/ThemeImageComponent/RewardsThemeImageComponent',
  () => {
    const { View } = jest.requireActual('react-native');
    const ReactActual = jest.requireActual('react');
    return {
      __esModule: true,
      default: () => ReactActual.createElement(View, { testID: 'theme-image' }),
    };
  },
);

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const map: Record<string, string> = {
      'rewards.onboarding.step_confirm': 'Next',
      'rewards.onboarding.step_skip': 'Skip',
    };
    return map[key] ?? key;
  },
}));

jest.mock('../../../../util/device', () => ({
  isLargeDevice: () => false,
}));

jest.mock('../components/Onboarding/ProgressIndicator', () => {
  const { View } = jest.requireActual('react-native');
  const ReactActual = jest.requireActual('react');
  return {
    __esModule: true,
    default: ({
      totalSteps,
      currentStep,
    }: {
      totalSteps: number;
      currentStep: number;
    }) =>
      ReactActual.createElement(View, {
        testID: 'progress-indicator-container',
        accessibilityLabel: `${currentStep}/${totalSteps}`,
      }),
  };
});

const mockGoToPage = jest.fn();
jest.mock('@tommasini/react-native-scrollable-tab-view', () => {
  const { View } = jest.requireActual('react-native');
  const ReactActual = jest.requireActual('react');
  return {
    __esModule: true,
    default: ReactActual.forwardRef(
      (
        {
          children,
          onChangeTab,
        }: {
          children: React.ReactNode;
          onChangeTab: (obj: { i: number }) => void;
        },
        ref: React.Ref<unknown>,
      ) => {
        ReactActual.useImperativeHandle(ref, () => ({
          goToPage: (page: number) => {
            mockGoToPage(page);
            onChangeTab({ i: page });
          },
        }));
        return ReactActual.createElement(
          View,
          { testID: 'scrollable-tab-view' },
          children,
        );
      },
    ),
  };
});

const tourSteps = [
  {
    title: 'Step 1 Title',
    description: 'Step 1 Description',
    image: null,
    actions: { next: true, skip: true },
  },
  {
    title: 'Step 2 Title',
    description: 'Step 2 Description',
    image: null,
    actions: { next: true, skip: false },
  },
  {
    title: 'Step 3 Title',
    description: 'Step 3 Description',
    image: null,
    actions: { next: true },
  },
];

const campaignWithTour: CampaignDto = {
  id: 'campaign-1',
  type: CampaignType.ONDO_HOLDING,
  name: 'Test Campaign',
  startDate: '2025-06-01T00:00:00.000Z',
  endDate: '2025-12-31T23:59:59.999Z',
  termsAndConditions: null,
  excludedRegions: [],
  featured: true,
  details: {
    howItWorks: {
      title: 'How It Works',
      description: 'Description',
      steps: [],
      tour: tourSteps,
    },
  },
};

const campaignWithoutTour: CampaignDto = {
  ...campaignWithTour,
  details: {
    howItWorks: {
      title: 'How It Works',
      description: 'Description',
      steps: [],
    },
  },
};

let mockCampaigns: CampaignDto[] = [campaignWithTour];

jest.mock('../../../../reducers/rewards/selectors', () => ({
  selectCampaigns: () => mockCampaigns,
}));

jest.mock('react-redux', () => ({
  useSelector: (selector: (state: unknown) => unknown) => selector({}),
}));

describe('CampaignTourStepView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCampaigns = [campaignWithTour];
  });

  it('renders all tour steps', () => {
    const { getByText } = render(<CampaignTourStepView />);

    expect(getByText('Step 1 Title')).toBeOnTheScreen();
    expect(getByText('Step 2 Title')).toBeOnTheScreen();
    expect(getByText('Step 3 Title')).toBeOnTheScreen();
  });

  it('renders Next and Skip buttons for first step', () => {
    const { getByTestId, getByText } = render(<CampaignTourStepView />);

    expect(
      getByTestId(CAMPAIGN_TOUR_STEP_TEST_IDS.NEXT_BUTTON),
    ).toBeOnTheScreen();
    expect(
      getByTestId(CAMPAIGN_TOUR_STEP_TEST_IDS.SKIP_BUTTON),
    ).toBeOnTheScreen();
    expect(getByText('Next')).toBeOnTheScreen();
    expect(getByText('Skip')).toBeOnTheScreen();
  });

  it('calls goToPage when Next is pressed on a non-last step', () => {
    const { getByTestId } = render(<CampaignTourStepView />);

    fireEvent.press(getByTestId(CAMPAIGN_TOUR_STEP_TEST_IDS.NEXT_BUTTON));

    expect(mockGoToPage).toHaveBeenCalledWith(1);
  });

  it('navigates to campaign details when Next is pressed on last step', () => {
    const { getByTestId } = render(<CampaignTourStepView />);

    fireEvent.press(getByTestId(CAMPAIGN_TOUR_STEP_TEST_IDS.NEXT_BUTTON));
    fireEvent.press(getByTestId(CAMPAIGN_TOUR_STEP_TEST_IDS.NEXT_BUTTON));
    fireEvent.press(getByTestId(CAMPAIGN_TOUR_STEP_TEST_IDS.NEXT_BUTTON));

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.REWARDS_ONDO_CAMPAIGN_DETAILS_VIEW,
      { campaignId: 'campaign-1' },
    );
  });

  it('navigates to campaign details when Skip is pressed', () => {
    const { getByTestId } = render(<CampaignTourStepView />);

    fireEvent.press(getByTestId(CAMPAIGN_TOUR_STEP_TEST_IDS.SKIP_BUTTON));

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.REWARDS_ONDO_CAMPAIGN_DETAILS_VIEW,
      { campaignId: 'campaign-1' },
    );
  });

  it('navigates to details when campaign has no tour data', () => {
    mockCampaigns = [campaignWithoutTour];

    render(<CampaignTourStepView />);

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.REWARDS_ONDO_CAMPAIGN_DETAILS_VIEW,
      { campaignId: 'campaign-1' },
    );
  });

  it('renders progress indicator', () => {
    const { getByTestId } = render(<CampaignTourStepView />);

    expect(getByTestId('progress-indicator-container')).toBeOnTheScreen();
  });
});
