import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import CampaignViewHeader from './CampaignViewHeader';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
    navigate: mockNavigate,
  }),
}));

jest.mock('@metamask/design-system-twrnc-preset', () => {
  const tw = (..._args: unknown[]) => ({});
  tw.style = jest.fn(() => ({}));
  return { useTailwind: () => tw };
});

jest.mock('../../../../../constants/navigation/Routes', () => ({
  REWARDS_CAMPAIGN_MECHANICS: 'REWARDS_CAMPAIGN_MECHANICS',
}));

jest.mock(
  '../../../../../component-library/components-temp/HeaderStandardGlass',
  () => {
    const ReactActual = jest.requireActual('react');
    const { View, Text, Pressable } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: ({
        title,
        onBack,
        backButtonProps,
        endButtonIconProps,
        isGlass,
        isFloating,
      }: {
        title: string;
        onBack: () => void;
        backButtonProps?: { testID?: string };
        endButtonIconProps?: { testID?: string; onPress?: () => void }[];
        isGlass?: boolean;
        isFloating?: boolean;
      }) =>
        ReactActual.createElement(
          View,
          {
            testID: isGlass ? 'campaign-header-glass' : 'campaign-header-plain',
          },
          ReactActual.createElement(Text, null, title),
          ReactActual.createElement(View, {
            testID:
              isFloating === false
                ? 'campaign-header-docked'
                : 'campaign-header-floating',
          }),
          ReactActual.createElement(Pressable, {
            onPress: onBack,
            testID: backButtonProps?.testID,
          }),
          ...(endButtonIconProps ?? []).map((btn, i) =>
            ReactActual.createElement(Pressable, {
              key: i,
              onPress: btn.onPress,
              testID: btn.testID,
            }),
          ),
        ),
    };
  },
);

const defaultProps = {
  title: 'Test Title',
  backButtonTestID: 'test-back-button',
  mechanicsButtonTestID: 'test-mechanics-button',
  hasCampaign: true,
  campaignId: 'campaign-123',
};

describe('CampaignViewHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the title', () => {
    const { getByText } = render(<CampaignViewHeader {...defaultProps} />);
    expect(getByText('Test Title')).toBeDefined();
  });

  it('calls goBack when back button is pressed', () => {
    const { getByTestId } = render(<CampaignViewHeader {...defaultProps} />);
    fireEvent.press(getByTestId('test-back-button'));
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('shows mechanics button when hasCampaign is true', () => {
    const { getByTestId } = render(<CampaignViewHeader {...defaultProps} />);
    expect(getByTestId('test-mechanics-button')).toBeDefined();
  });

  it('hides mechanics button when hasCampaign is false', () => {
    const { queryByTestId } = render(
      <CampaignViewHeader {...defaultProps} hasCampaign={false} />,
    );
    expect(queryByTestId('test-mechanics-button')).toBeNull();
  });

  it('navigates to campaign mechanics when mechanics button is pressed', () => {
    const { getByTestId } = render(<CampaignViewHeader {...defaultProps} />);
    fireEvent.press(getByTestId('test-mechanics-button'));
    expect(mockNavigate).toHaveBeenCalledWith('REWARDS_CAMPAIGN_MECHANICS', {
      campaignId: 'campaign-123',
    });
  });

  it('renders the plain docked header when isGlass is omitted', () => {
    const { getByTestId } = render(<CampaignViewHeader {...defaultProps} />);
    expect(getByTestId('campaign-header-plain')).toBeDefined();
    expect(getByTestId('campaign-header-docked')).toBeDefined();
  });

  it('renders the glass header when isGlass is true', () => {
    const { getByTestId } = render(
      <CampaignViewHeader {...defaultProps} isGlass />,
    );
    expect(getByTestId('campaign-header-glass')).toBeDefined();
    expect(getByTestId('campaign-header-docked')).toBeDefined();
  });
});
