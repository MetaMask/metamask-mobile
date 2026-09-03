import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { IconName, TagSeverity } from '@metamask/design-system-react-native';
import type { EarnExperience, EarnRate } from '../../types/earnAssets';
import { EARN_EXPERIENCES } from '../../constants/experiences';
import EarnStrategyCard, { getRateTagSeverity } from './EarnStrategyCard';
import {
  EarnStrategyCardVariant,
  type EarnStrategyCardProps,
} from './EarnStrategyCard.types';
import { EarnStrategyCardSelectorsIDs } from './EarnStrategyCard.testIds';

const cardTestID = 'strategy-card';

const createRate = (): EarnRate => ({
  type: 'APY',
  status: 'ready',
  percentage: 6.2,
});

const createExperience = (
  type: EarnExperience['type'],
  overrides: Partial<EarnExperience> = {},
): EarnExperience => ({
  id: `${type}:usdc`,
  type,
  role: type === 'MONEY_ACCOUNT_DEPOSIT' ? 'funding' : 'underlying',
  rate: createRate(),
  isFeeSubsidized: false,
  ...overrides,
});

const createPrimaryProps = (
  overrides: Partial<
    Extract<EarnStrategyCardProps, { variant: EarnStrategyCardVariant.Primary }>
  > = {},
): Extract<
  EarnStrategyCardProps,
  { variant: EarnStrategyCardVariant.Primary }
> => {
  const experience = createExperience('MONEY_ACCOUNT_DEPOSIT');

  return {
    variant: EarnStrategyCardVariant.Primary,
    experience: {
      ...experience,
      type: 'MONEY_ACCOUNT_DEPOSIT',
    },
    title: 'Money account',
    infoRows: [
      { id: 'row-1', icon: IconName.Chart, text: 'First detail' },
      { id: 'row-2', icon: IconName.Lock, text: 'Second detail' },
      { id: 'row-3', icon: IconName.SecurityTick, text: 'Third detail' },
    ],
    isActive: false,
    testID: cardTestID,
    ...overrides,
    onPress: overrides.onPress ?? jest.fn(),
  };
};

const createSecondaryProps = (
  overrides: Partial<
    Extract<
      EarnStrategyCardProps,
      { variant: EarnStrategyCardVariant.Secondary }
    >
  > = {},
): Extract<
  EarnStrategyCardProps,
  { variant: EarnStrategyCardVariant.Secondary }
> => {
  const experience = createExperience(EARN_EXPERIENCES.STABLECOIN_LENDING);

  return {
    variant: EarnStrategyCardVariant.Secondary,
    experience: {
      ...experience,
      type: EARN_EXPERIENCES.STABLECOIN_LENDING,
    },
    title: 'Lend USDC',
    subtitle: 'Variable yield',
    isActive: false,
    testID: cardTestID,
    ...overrides,
    onPress: overrides.onPress ?? jest.fn(),
  };
};

describe('EarnStrategyCard', () => {
  it('renders the primary card with its three information rows and Money success rate tag', () => {
    const { getByTestId, getByText } = render(
      <EarnStrategyCard {...createPrimaryProps()} />,
    );
    const rateTag = getByTestId(
      `${cardTestID}-${EarnStrategyCardSelectorsIDs.RATE_TAG}`,
    );

    expect(getByText('Money account')).toBeOnTheScreen();
    expect(getByText('Up to 6.2% APY')).toBeOnTheScreen();
    expect(rateTag).toBeOnTheScreen();
    expect(getRateTagSeverity('MONEY_ACCOUNT_DEPOSIT')).toBe(
      TagSeverity.Success,
    );
    expect(getByText('First detail')).toBeOnTheScreen();
    expect(getByText('Second detail')).toBeOnTheScreen();
    expect(getByText('Third detail')).toBeOnTheScreen();
    expect(
      getByTestId(`${cardTestID}-${EarnStrategyCardSelectorsIDs.INFO_ROW}-0`),
    ).toBeOnTheScreen();
    expect(
      getByTestId(`${cardTestID}-${EarnStrategyCardSelectorsIDs.INFO_ROW}-1`),
    ).toBeOnTheScreen();
    expect(
      getByTestId(`${cardTestID}-${EarnStrategyCardSelectorsIDs.INFO_ROW}-2`),
    ).toBeOnTheScreen();
  });

  it('renders the secondary card without information rows and with an informational rate tag', () => {
    const { getByTestId, getByText, queryByTestId } = render(
      <EarnStrategyCard {...createSecondaryProps()} />,
    );
    const rateTag = getByTestId(
      `${cardTestID}-${EarnStrategyCardSelectorsIDs.RATE_TAG}`,
    );

    expect(getByText('Lend USDC')).toBeOnTheScreen();
    expect(getByText('Variable yield')).toBeOnTheScreen();
    expect(rateTag).toBeOnTheScreen();
    expect(getRateTagSeverity(EARN_EXPERIENCES.STABLECOIN_LENDING)).toBe(
      TagSeverity.Neutral,
    );
    expect(
      queryByTestId(`${cardTestID}-${EarnStrategyCardSelectorsIDs.INFO_ROW}-0`),
    ).toBeNull();
  });

  it('renders ready APR rate copy', () => {
    const props = createSecondaryProps({
      experience: {
        ...createSecondaryProps().experience,
        rate: { type: 'APR', status: 'ready', percentage: 3.8 },
      },
    });

    const { getByText } = render(<EarnStrategyCard {...props} />);

    expect(getByText('Up to 3.8% APR')).toBeOnTheScreen();
  });

  it.each([true, false])(
    'renders the no-fee tag when fee subsidization is %s',
    (isFeeSubsidized) => {
      const { queryByTestId } = render(
        <EarnStrategyCard
          {...createPrimaryProps({
            experience: {
              ...createPrimaryProps().experience,
              isFeeSubsidized,
            },
          })}
        />,
      );

      const noFeeTag = queryByTestId(
        `${cardTestID}-${EarnStrategyCardSelectorsIDs.NO_FEE_TAG}`,
      );

      if (isFeeSubsidized) {
        expect(noFeeTag).toBeOnTheScreen();
      } else {
        expect(noFeeTag).toBeNull();
      }
    },
  );

  it('exposes active state, renders the checkmark, and invokes onPress', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <EarnStrategyCard
        {...createSecondaryProps({ isActive: true, onPress })}
      />,
    );
    const card = getByTestId(cardTestID);

    expect(card.props.accessibilityState).toEqual({ selected: true });
    expect(
      getByTestId(`${cardTestID}-${EarnStrategyCardSelectorsIDs.ACTIVE_CHECK}`),
    ).toBeOnTheScreen();

    fireEvent.press(card);

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it.each(['loading', 'error', 'unavailable'] as const)(
    'hides the rate tag when the experience rate status is %s',
    (status) => {
      const props = createSecondaryProps({
        experience: {
          ...createSecondaryProps().experience,
          rate: { type: 'APR', status },
        },
      });

      const { queryByTestId } = render(<EarnStrategyCard {...props} />);

      expect(
        queryByTestId(`${cardTestID}-${EarnStrategyCardSelectorsIDs.RATE_TAG}`),
      ).not.toBeOnTheScreen();
    },
  );
});
