import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { IconName, TagSeverity } from '@metamask/design-system-react-native';
import type {
  EarnAsset,
  EarnExperience,
  EarnRate,
} from '../../types/earnAssets';
import { EARN_EXPERIENCES } from '../../constants/experiences';
import EarnStrategyCardV2, { getRateTagSeverity } from './EarnStrategyCard';
import {
  EarnStrategyCardVariant,
  type EarnStrategyCardProps,
} from './EarnStrategyCard.types';
import { EarnStrategyCardV2SelectorsIDs } from './EarnStrategyCardV2.testIds';

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

const createEarnAsset = (experience: EarnExperience): EarnAsset => ({
  kind: 'discovery',
  assetId: 'eip155:1/erc20:0x123',
  metadata: {
    address: '0x123',
    chainId: '0x1',
    decimals: 6,
    image: '',
    name: 'USD Coin',
    symbol: 'USDC',
    logo: undefined,
    isETH: false,
  },
  experiences: [experience],
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
    earnAsset: createEarnAsset(experience),
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
    earnAsset: createEarnAsset(experience),
    experience: {
      ...experience,
      type: EARN_EXPERIENCES.STABLECOIN_LENDING,
    },
    title: 'Lend USDC',
    subtitle: 'Variable yield',
    isActive: false,
    testID: cardTestID,
    ...overrides,
  };
};

describe('EarnStrategyCardV2', () => {
  it('renders the primary card with its three information rows and Money success rate tag', () => {
    const { getByTestId, getByText } = render(
      <EarnStrategyCardV2 {...createPrimaryProps()} />,
    );

    expect(getByText('Money account')).toBeOnTheScreen();
    expect(getByText('6.2% APY')).toBeOnTheScreen();
    expect(getRateTagSeverity('MONEY_ACCOUNT_DEPOSIT')).toBe(
      TagSeverity.Success,
    );
    expect(
      getByTestId(`${cardTestID}-${EarnStrategyCardV2SelectorsIDs.RATE_TAG}`),
    ).toBeOnTheScreen();
    expect(
      getByTestId(`${cardTestID}-${EarnStrategyCardV2SelectorsIDs.INFO_ROW}-0`),
    ).toBeOnTheScreen();
    expect(
      getByTestId(`${cardTestID}-${EarnStrategyCardV2SelectorsIDs.INFO_ROW}-1`),
    ).toBeOnTheScreen();
    expect(
      getByTestId(`${cardTestID}-${EarnStrategyCardV2SelectorsIDs.INFO_ROW}-2`),
    ).toBeOnTheScreen();
  });

  it('renders the secondary card without information rows and with an informational rate tag', () => {
    const { getByTestId, getByText, queryByTestId } = render(
      <EarnStrategyCardV2 {...createSecondaryProps()} />,
    );

    expect(getByText('Lend USDC')).toBeOnTheScreen();
    expect(getByText('Variable yield')).toBeOnTheScreen();
    expect(getRateTagSeverity(EARN_EXPERIENCES.STABLECOIN_LENDING)).toBe(
      TagSeverity.Info,
    );
    expect(
      getByTestId(`${cardTestID}-${EarnStrategyCardV2SelectorsIDs.RATE_TAG}`),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(
        `${cardTestID}-${EarnStrategyCardV2SelectorsIDs.INFO_ROW}-0`,
      ),
    ).toBeNull();
  });

  it.each([true, false])(
    'renders the no-fee tag when fee subsidization is %s',
    (isFeeSubsidized) => {
      const { queryByTestId } = render(
        <EarnStrategyCardV2
          {...createPrimaryProps({
            experience: {
              ...createPrimaryProps().experience,
              isFeeSubsidized,
            },
          })}
        />,
      );

      const noFeeTag = queryByTestId(
        `${cardTestID}-${EarnStrategyCardV2SelectorsIDs.NO_FEE_TAG}`,
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
      <EarnStrategyCardV2
        {...createSecondaryProps({ isActive: true, onPress })}
      />,
    );
    const card = getByTestId(cardTestID);

    expect(card.props.accessibilityState).toEqual({ selected: true });
    expect(
      getByTestId(
        `${cardTestID}-${EarnStrategyCardV2SelectorsIDs.ACTIVE_CHECK}`,
      ),
    ).toBeOnTheScreen();

    fireEvent.press(card);

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders visible unavailable copy when the experience rate is not ready', () => {
    const props = createSecondaryProps({
      experience: {
        ...createSecondaryProps().experience,
        rate: { type: 'APR', status: 'unavailable' },
      },
    });

    const { getByText } = render(<EarnStrategyCardV2 {...props} />);

    expect(getByText('Rate unavailable')).toBeOnTheScreen();
  });
});
