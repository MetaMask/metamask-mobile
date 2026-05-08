import React from 'react';
import { render } from '@testing-library/react-native';
import CampaignTourStep, {
  CAMPAIGN_TOUR_STEP_TEST_IDS,
} from './CampaignTourStep';
import type { OndoCampaignTourStepDto } from '../../../../../../core/Engine/controllers/rewards-controller/types';

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  return { ...actual };
});

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({ style: (...args: unknown[]) => args }),
}));

jest.mock('../../ThemeImageComponent/RewardsThemeImageComponent', () => {
  const { View } = jest.requireActual('react-native');
  const ReactActual = jest.requireActual('react');
  return {
    __esModule: true,
    default: ({ themeImage }: { themeImage: { lightModeUrl: string } }) =>
      ReactActual.createElement(View, {
        testID: 'theme-image',
        accessibilityLabel: themeImage.lightModeUrl,
      }),
  };
});

const baseStep: OndoCampaignTourStepDto = {
  title: 'Welcome to the Campaign',
  description: 'Learn how this works.',
  image: {
    lightModeUrl: 'https://example.com/light.png',
    darkModeUrl: 'https://example.com/dark.png',
  },
  actions: { next: true, skip: true },
};

describe('CampaignTourStep', () => {
  it('renders title and description', () => {
    const { getByText } = render(<CampaignTourStep step={baseStep} />);

    expect(getByText('Welcome to the Campaign')).toBeOnTheScreen();
    expect(getByText('Learn how this works.')).toBeOnTheScreen();
  });

  it('renders image when provided', () => {
    const { getByTestId } = render(<CampaignTourStep step={baseStep} />);

    expect(getByTestId('theme-image')).toBeOnTheScreen();
  });

  it('does not render image when null', () => {
    const { queryByTestId } = render(
      <CampaignTourStep step={{ ...baseStep, image: null }} />,
    );

    expect(queryByTestId('theme-image')).toBeNull();
  });

  it('renders title with correct test ID', () => {
    const { getByTestId } = render(<CampaignTourStep step={baseStep} />);

    expect(getByTestId(CAMPAIGN_TOUR_STEP_TEST_IDS.TITLE)).toBeOnTheScreen();
  });

  it('renders description with correct test ID', () => {
    const { getByTestId } = render(<CampaignTourStep step={baseStep} />);

    expect(
      getByTestId(CAMPAIGN_TOUR_STEP_TEST_IDS.DESCRIPTION),
    ).toBeOnTheScreen();
  });
});
