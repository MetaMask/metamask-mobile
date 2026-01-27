import { Mockttp } from 'mockttp';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.ts';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.ts';
import TabBarComponent from '../../../e2e/pages/wallet/TabBarComponent.ts';
import { SmokeRewards } from '../../../e2e/tags';
import { loginToApp } from '../../../e2e/viewHelper.ts';
import RewardsClaimBonus from '../../../e2e/pages/Rewards/RewardsOnboarding.ts';
import Assertions from '../../framework/Assertions.ts';
import RewardsView from '../../../e2e/pages/Rewards/RewardsView.ts';
import RewardsActivityTabView from '../../../e2e/pages/Rewards/RewardsActivityTabView.ts';
import {
  setUpActivityMocks,
  setUpRewardsOnboardingMocks,
} from './rewards.mocks.ts';

describe.skip(SmokeRewards('Rewards Feature Test'), () => {
  it('should opt-in to rewards successfully', async () => {
    const testSpecificMock = async (mockServer: Mockttp) => {
      await setUpRewardsOnboardingMocks(mockServer);
    };
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
        testSpecificMock,
      },
      async () => {
        await device.disableSynchronization();
        await loginToApp();
        await TabBarComponent.tapRewards();
        await RewardsClaimBonus.tapRewardsClaimBonusButton();
        await RewardsClaimBonus.existsRewardsOnboardingInfoScreen1();
        await RewardsClaimBonus.tapRewardsOnboardingNextButton();
        await RewardsClaimBonus.existsRewardsOnboardingInfoScreen2();
        await RewardsClaimBonus.tapRewardsOnboardingNextButton();
        await RewardsClaimBonus.existsRewardsOnboardingInfoScreen3();
        await RewardsClaimBonus.tapRewardsOnboardingNextButton();
        await RewardsClaimBonus.existsRewardsOnboardingInfoScreen4();
        await RewardsClaimBonus.tapRewardsOnboardingNextButton();
        await Assertions.expectElementToBeVisible(
          RewardsView.rewardsOverviewTabButton,
          {
            elemDescription: 'Rewards Overview Tab Button',
          },
        );
        await RewardsView.tapRewardActivityTabButton();
        await Assertions.expectElementToHaveText(
          RewardsActivityTabView.signUpBonusTitle,
          'Sign up bonus',
          {
            description: 'Sign up bonus title should have correct text',
          },
        );
        await Assertions.expectElementToHaveText(
          RewardsActivityTabView.signUpBonusValue,
          '+250',
          {
            description: 'Sign up bonus value should have correct text',
          },
        );
        await Assertions.expectElementToHaveText(
          RewardsView.seasonStatusLevel,
          'Level 1',
          {
            description: 'Season status level should have correct text',
          },
        );
        await Assertions.expectElementToHaveText(
          RewardsView.seasonStatusTierName,
          'Origin',
          {
            description: 'Season status tier name should have correct text',
          },
        );
        await Assertions.expectElementToHaveText(
          RewardsView.seasonStatusPoints,
          '250',
          {
            description: 'Season status points should have correct text',
          },
        );
      },
    );
  });

  it('should display activity details inactivity tab successfully', async () => {
    const testSpecificMock = async (mockServer: Mockttp) => {
      await setUpActivityMocks(mockServer);
    };
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
        testSpecificMock,
      },
      async () => {
        await device.disableSynchronization();
        await loginToApp();
        await TabBarComponent.tapRewards();
        await RewardsView.tapRewardActivityTabButton();

        await Assertions.expectElementToHaveText(
          RewardsView.seasonStatusLevel,
          'Level 4',
          {
            description: 'Season status level should have correct text',
          },
        );
        await Assertions.expectElementToHaveText(
          RewardsView.seasonStatusTierName,
          'Oceania',
          {
            description: 'Season status tier name should have correct text',
          },
        );
        await Assertions.expectElementToHaveText(
          RewardsView.seasonStatusPoints,
          '52,000',
          {
            description: 'Season status points should have correct text',
          },
        );

        // Verify specific data in each row using page object
        await Assertions.expectElementToHaveText(
          RewardsActivityTabView.signUpBonusTitle,
          'Sign up bonus',
          {
            description: 'Sign up bonus title should have correct text',
          },
        );
        await Assertions.expectElementToHaveText(
          RewardsActivityTabView.signUpBonusValue,
          '+250',
          {
            description: 'Sign up bonus value should have correct text',
          },
        );

        await Assertions.expectElementToHaveText(
          RewardsActivityTabView.perpsTitle,
          'Opened position',
          {
            description: 'Perps title should have correct text',
          },
        );
        await Assertions.expectElementToHaveText(
          RewardsActivityTabView.perpsValue,
          '+75',
          {
            description: 'Perps value should have correct text',
          },
        );
        await Assertions.expectElementToHaveText(
          RewardsActivityTabView.perpsDetails,
          'Long 0.5 ETH',
          {
            description: 'Perps details should have correct text',
          },
        );

        await Assertions.expectElementToHaveText(
          RewardsActivityTabView.firstSwapTitle,
          'Swap',
          {
            description: 'First swap title should have correct text',
          },
        );
        await Assertions.expectElementToHaveText(
          RewardsActivityTabView.firstSwapValue,
          '+10',
          {
            description: 'First swap value should have correct text',
          },
        );
        await Assertions.expectElementToHaveText(
          RewardsActivityTabView.firstSwapDetails,
          '1 ETH to USDC',
          {
            description: 'First swap details should have correct text',
          },
        );

        await Assertions.expectElementToHaveText(
          RewardsActivityTabView.referralTitle,
          'Referral action',
          {
            description: 'Referral title should have correct text',
          },
        );
        await Assertions.expectElementToHaveText(
          RewardsActivityTabView.referralValue,
          '+100',
          {
            description: 'Referral value should have correct text',
          },
        );
      },
    );
  });
});
