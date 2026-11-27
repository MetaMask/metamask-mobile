import '../mocks';
import React from 'react';
import Engine from '../../../app/core/Engine';
import BenefitsPreview from '../../../app/components/UI/Rewards/components/Benefits/BenefitsPreview';
import Routes from '../../../app/constants/navigation/Routes';
import type {
  SubscriptionBenefitDto,
  SubscriptionBenefitsState,
} from '../../../app/core/Engine/controllers/rewards-controller/types';
import { renderComponentViewScreen } from '../render';
import { createStateFixture } from '../stateFixture';
import { initialState as rewardsInitialState } from '../../../app/reducers/rewards';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';

export const BENEFITS_SUBSCRIPTION_ID = 'benefits-subscription-1';

/** One benefit row with the fields the carousel card reads. */
export function benefitFixture(index: number): SubscriptionBenefitDto {
  const id = index + 1;
  return {
    id,
    longTitle: `Benefit ${id}`,
    shortDescription: `Description for benefit ${id}`,
    longDescription: `Long description for benefit ${id}`,
    thumbnail: `https://benefits.test/${id}.png`,
    validFrom: '2026-11-01T00:00:00.000Z',
    validTo: null,
    url: `https://benefits.test/${id}`,
    actionDate: null,
    chain: 'eip155:1',
    type: { id: 1, name: 'Partner benefit' },
    companyName: 'Partner',
  };
}

/** The payload `RewardsController:getBenefits` resolves with. */
export function benefitsPayload(count: number): SubscriptionBenefitsState {
  return {
    benefits: Array.from({ length: count }, (_, index) =>
      benefitFixture(index),
    ),
    limit: count,
    lastFetched: Date.parse('2026-11-01T00:00:00.000Z'),
  };
}

export interface RenderBenefitsPreviewOptions {
  overrides?: DeepPartial<RootState>;
  /** Benefits the Engine serves on mount. Defaults to nine tiles. */
  benefitsCount?: number;
}

/**
 * The dashboard's benefits carousel with real Redux. The read is an Engine
 * call; the subscription comes from the rewards state.
 */
export function renderBenefitsPreview(
  options: RenderBenefitsPreviewOptions = {},
) {
  const { benefitsCount = 9 } = options;
  const payload = benefitsPayload(benefitsCount);
  // The Messenger's `call` is a jest.fn across the suite; binding it would
  // drop the mock API the renderer drives.
  // oxlint-disable-next-line typescript/unbound-method
  const engine = Engine.controllerMessenger.call as jest.Mock;
  const baseEngineCall = engine.getMockImplementation();
  engine.mockReset();
  engine.mockImplementation((action: string, ...args: unknown[]) => {
    if (action === 'RewardsController:getBenefits') {
      return Promise.resolve(payload);
    }
    if (baseEngineCall) {
      return baseEngineCall(action, ...args);
    }
    return Promise.resolve(undefined);
  });

  const state = createStateFixture()
    .withMinimalAccounts()
    .withMinimalMainnetNetwork()
    .withMinimalKeyringController()
    .withAccountTreeForSelectedAccount()
    .withRemoteFeatureFlags({})
    .withOverrides({
      rewards: {
        ...rewardsInitialState,
      },
      engine: {
        backgroundState: {
          RewardsController: {
            activeAccount: {
              account: `eip155:1:0x0000000000000000000000000000000000000001`,
              subscriptionId: BENEFITS_SUBSCRIPTION_ID,
              perpsFeeDiscount: null,
              lastPerpsDiscountRateFetched: null,
            },
          },
        },
      },
      ...options.overrides,
    })
    .build();

  const screen = renderComponentViewScreen(
    BenefitsPreview,
    { name: 'BenefitsPreview' },
    { state },
  );
  return { ...screen, engine };
}
