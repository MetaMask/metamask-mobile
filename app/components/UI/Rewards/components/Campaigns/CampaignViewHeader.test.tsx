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

jest.mock(
  '../../../../../component-library/components-temp/HeaderCompactStandard',
  () => {
    const ReactActual = jest.requireActual('react');
    const { View, Text, Pressable } = jest.requireActual('react-native');
    return ({
      title,
      onBack,
      backButtonProps,
      endButtonIconProps,
    }: {
      title: string;
      onBack: () => void;
      backButtonProps?: { testID?: string };
      endButtonIconProps?: Array<{ testID?: string; onPress: () => void }>;
    }) =>
      ReactActual.createElement(
        View,
        null,
        ReactActual.createElement(Text, null, title),
        ReactActual.createElement(
          Pressable,
          { testID: backButtonProps?.testID, onPress: onBack },
          'back',
        ),
        endButtonIconProps?.map((btn) =>
          ReactActual.createElement(
            Pressable,
            { key: btn.testID, testID: btn.testID, onPress: btn.onPress },
            'info',
          ),
        ),
      );
  },
);

jest.mock('@metamask/design-system-react-native', () => ({
  TextVariant: { HeadingSm: 'headingSm' },
}));
jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({ style: (...args: unknown[]) => args }),
}));

jest.mock('../../../../../constants/navigation/Routes', () => ({
  REWARDS_CAMPAIGN_MECHANICS: 'REWARDS_CAMPAIGN_MECHANICS',
}));

jest.mock('../../utils/campaignHeaderUtils', () => ({
  getCampaignMechanicsButtonProps: (
    hasCampaign: boolean,
    onPress: () => void,
    testID: string,
  ) => (hasCampaign ? [{ onPress, testID }] : undefined),
}));

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
});
