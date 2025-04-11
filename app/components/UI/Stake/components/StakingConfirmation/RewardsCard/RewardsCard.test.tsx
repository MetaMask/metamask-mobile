import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import RewardsCard from './RewardsCard';
import { RewardsCardProps } from './RewardsCard.types';
import { fireEvent } from '@testing-library/react-native';
import { strings } from '../../../../../../../locales/i18n';

const mockNavigate = jest.fn();

// Updated mock to ensure it returns a clean navigation object
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

    const { getByLabelText } = renderWithProvider(
      <RewardsCard {...props} />,
    );

    // Get tooltip element and press it
    const tooltipElement = getByLabelText(`${strings('tooltip_modal.reward_rate.title')} tooltip`);
    fireEvent.press(tooltipElement);

    // Verify navigation was called correctly
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('RootModalFlow', {
      params: {
        title: strings('tooltip_modal.reward_rate.title'),
        tooltip: strings('tooltip_modal.reward_rate.tooltip'),
      },
      screen: 'tooltipModal',
    });
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
      },
      screen: 'tooltipModal',
    });

    expect(toJSON()).toMatchSnapshot();
  });
});
