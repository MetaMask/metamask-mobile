import React from 'react';
import { render } from '@testing-library/react-native';
import ManageCardOptions from './ManageCardOptions';
import { CardHomeSelectors } from '../CardHome.testIds';
import { CardType } from '../../../types';
import {
  CardStatus,
  type CardDetails,
  type CardProviderCapabilities,
} from '../../../../../../core/Engine/controllers/card-controller/provider-types';

jest.mock('../../../components/ManageCardListItem', () => {
  const { View, Text } = jest.requireActual('react-native');
  return (props: { testID?: string; title?: string }) => (
    <View testID={props.testID}>
      <Text>{props.title}</Text>
    </View>
  );
});

const CARD: CardDetails = {
  id: 'card-1',
  status: CardStatus.ACTIVE,
  type: CardType.VIRTUAL,
  lastFour: '1234',
  isFreezable: true,
};

const buildCapabilities = (
  overrides: Partial<CardProviderCapabilities>,
): CardProviderCapabilities =>
  ({
    supportsFundingLimits: true,
    supportsPinView: false,
    supportsCashback: false,
    supportsSensitiveDetailsView: false,
    supportsTravel: true,
    ...overrides,
  }) as CardProviderCapabilities;

const renderComponent = (
  capabilities: CardProviderCapabilities,
  cardDetailsVisible = false,
) =>
  render(
    <ManageCardOptions
      card={CARD}
      account={{ verificationStatus: 'VERIFIED' } as never}
      capabilities={capabilities}
      isMetalCardCheckoutEnabled={false}
      isAuthenticated
      isLoading={false}
      hasSetupActions={false}
      hasAlertOnlyState={false}
      hasSetupAlerts={false}
      userLocation="gb"
      isFrozen={false}
      isFreezeLoading={false}
      isPinLoading={false}
      cardDetailsVisible={cardDetailsVisible}
      onViewCardDetails={jest.fn()}
      onViewPin={jest.fn()}
      onToggleFreeze={jest.fn()}
      onManageSpendingLimit={jest.fn()}
      showUnlinkMoneyAccount={false}
      onUnlinkMoneyAccount={jest.fn()}
      onOrderMetalCard={jest.fn()}
      isSpendingLimitActive
      onChangeAsset={jest.fn()}
      hasPriorityTokenBalance
      onCashback={jest.fn()}
      onTravel={jest.fn()}
    />,
  );

describe('ManageCardOptions funding-limit gating', () => {
  it('shows change asset and manage spending limit when supportsFundingLimits is true', () => {
    const { getByTestId } = renderComponent(
      buildCapabilities({ supportsFundingLimits: true }),
    );

    expect(
      getByTestId(CardHomeSelectors.CHANGE_ASSET_BUTTON),
    ).toBeOnTheScreen();
    expect(
      getByTestId(CardHomeSelectors.MANAGE_SPENDING_LIMIT_ITEM),
    ).toBeOnTheScreen();
  });

  it('hides change asset and manage spending limit when supportsFundingLimits is false', () => {
    const { queryByTestId } = renderComponent(
      buildCapabilities({ supportsFundingLimits: false }),
    );

    expect(queryByTestId(CardHomeSelectors.CHANGE_ASSET_BUTTON)).toBeNull();
    expect(
      queryByTestId(CardHomeSelectors.MANAGE_SPENDING_LIMIT_ITEM),
    ).toBeNull();
  });
});

describe('ManageCardOptions travel gating', () => {
  it('shows the travel option when supportsTravel is true', () => {
    const { getByTestId } = renderComponent(
      buildCapabilities({ supportsTravel: true }),
    );

    expect(getByTestId(CardHomeSelectors.TRAVEL_ITEM)).toBeOnTheScreen();
  });

  it('hides the travel option when supportsTravel is false', () => {
    const { queryByTestId } = renderComponent(
      buildCapabilities({ supportsTravel: false }),
    );

    expect(queryByTestId(CardHomeSelectors.TRAVEL_ITEM)).toBeNull();
  });
});

describe('ManageCardOptions view/hide card details label', () => {
  it('shows "View card details" when details are not visible', () => {
    const { getByTestId } = renderComponent(
      buildCapabilities({ supportsSensitiveDetailsView: true }),
      false,
    );

    expect(
      getByTestId(CardHomeSelectors.VIEW_CARD_DETAILS_BUTTON),
    ).toHaveTextContent('View card details');
  });

  it('shows "Hide card details" when details are visible', () => {
    const { getByTestId } = renderComponent(
      buildCapabilities({ supportsSensitiveDetailsView: true }),
      true,
    );

    expect(
      getByTestId(CardHomeSelectors.VIEW_CARD_DETAILS_BUTTON),
    ).toHaveTextContent('Hide card details');
  });
});
