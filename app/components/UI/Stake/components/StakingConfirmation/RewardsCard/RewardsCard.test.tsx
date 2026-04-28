import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import RewardsCard from './RewardsCard';
import { RewardsCardProps } from './RewardsCard.types';
import { fireEvent } from '@testing-library/react-native';
import { strings } from '../../../../../../../locales/i18n';
import { useAnalytics } from '../../../../../hooks/useAnalytics/useAnalytics';
import { createMockUseAnalyticsHook } from '../../../../../../util/test/analyticsMock';

jest.mock('../../../../../hooks/useAnalytics/useAnalytics');

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

describe('RewardsCard', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.mocked(useAnalytics).mockReturnValue(createMockUseAnalyticsHook());
  });

  it('render matches snapshot', () => {
    const props: RewardsCardProps = {
      rewardRate: '2.6%',
      rewardsEth: '0.13 ETH',
      rewardsFiat: '$334.93',
    };

    const { getByText, toJSON } = renderWithProvider(
      <RewardsCard {...props} />,
    );

    expect(getByText(props.rewardRate)).toBeDefined();
    expect(getByText(props.rewardsEth)).toBeDefined();
    expect(getByText(props.rewardsFiat)).toBeDefined();

    expect(toJSON()).toMatchSnapshot();
  });

  it('reward rate tooltip displayed when pressed', () => {
    const props: RewardsCardProps = {
      rewardRate: '2.6%',
      rewardsEth: '0.13 ETH',
      rewardsFiat: '$334.93',
    };

    const { toJSON, getByLabelText } = renderWithProvider(
      <RewardsCard {...props} />,
    );

    fireEvent.press(
      getByLabelText(`${strings('tooltip_modal.reward_rate.title')} tooltip`),
    );

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('RootModalFlow', {
      params: {
        title: strings('tooltip_modal.reward_rate.title'),
        tooltip: strings('tooltip_modal.reward_rate.tooltip'),
        footerText: undefined,
        buttonText: undefined,
      },
      screen: 'tooltipModal',
    });

    expect(toJSON()).toMatchSnapshot();
  });

  it('reward frequency tooltip displayed when pressed', () => {
    const props: RewardsCardProps = {
      rewardRate: '2.6%',
      rewardsEth: '0.13 ETH',
      rewardsFiat: '$334.93',
    };

    const { toJSON, getByLabelText } = renderWithProvider(
      <RewardsCard {...props} />,
    );

    fireEvent.press(
      getByLabelText(
        `${strings('tooltip_modal.reward_frequency.title')} tooltip`,
      ),
    );

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('RootModalFlow', {
      params: {
        title: strings('tooltip_modal.reward_frequency.title'),
        tooltip: strings('tooltip_modal.reward_frequency.tooltip'),
        footerText: undefined,
        buttonText: undefined,
      },
      screen: 'tooltipModal',
    });

    expect(toJSON()).toMatchSnapshot();
  });
});
