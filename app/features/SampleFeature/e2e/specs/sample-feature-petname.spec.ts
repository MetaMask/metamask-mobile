'use strict';
import SampleFeatureView from '../pages/SampleFeatureView';
import { RegressionSampleFeature } from '../../../../../e2e/tags';
import FixtureBuilder from '../../../../../tests/framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../../../tests/framework/fixtures/FixtureHelper';
import { navigateToSampleFeature } from '../utils';
import Assertions from '../../../../../tests/framework/Assertions';

interface TestAddress {
  address: string;
  shortAddress: string;
}

// Short address format: First 7 chars (including 0x) + ... + Last 5 chars
// Example: 0x086473d15475Cf20722F5cA7D8d4adfa39Dc6E05 -> 0x08647...c6E05
const TEST_ADDRESSES: Record<string, TestAddress> = {
  Alice: {
    address: '0x086473d15475Cf20722F5cA7D8d4adfa39Dc6E05',
    shortAddress: '0x08647...c6E05',
  },
  Bob: {
    address: '0x4AE1Ed9eaf935B0043536e83cB833e90e98A0E44',
    shortAddress: '0x4AE1E...A0E44',
  },
  Charlie: {
    address: '0xA8c23800fe9942e9aBd6F3669018934598777eC1',
    shortAddress: '0xA8c23...77eC1',
  },
};

describe(RegressionSampleFeature('Sample Feature - Pet Names'), () => {
  it('displays pet names section', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
      },
      async () => {
        await navigateToSampleFeature();
        // Verify Pet Names form is visible
        await Assertions.expectElementToBeVisible(
          SampleFeatureView.petNameAddressInput,
        );
        await Assertions.expectElementToBeVisible(
          SampleFeatureView.petNameNameInput,
        );
        await Assertions.expectElementToBeVisible(
          SampleFeatureView.addPetNameButton,
        );
      },
    );
  });

  it('creates a new pet name', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
      },
      async () => {
        await navigateToSampleFeature();

        // Enter valid address and name
        await SampleFeatureView.enterPetNameAddress(
          TEST_ADDRESSES.Alice.address,
        );
        await SampleFeatureView.enterPetNameName('Alice');

        // Tap add button
        await SampleFeatureView.tapAddPetNameButton();

        // Verify the pet name appears in the list
        await Assertions.expectTextDisplayed('Alice');
        await Assertions.expectTextDisplayed(TEST_ADDRESSES.Alice.shortAddress);
      },
    );
  });

  it('creates multiple pet names', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
      },
      async () => {
        await navigateToSampleFeature();

        // Add Bob
        await SampleFeatureView.enterPetNameAddress(TEST_ADDRESSES.Bob.address);
        await SampleFeatureView.enterPetNameName('Bob');
        await SampleFeatureView.tapAddPetNameButton();

        // Verify Bob appears with correct short address
        await Assertions.expectTextDisplayed('Bob');
        await Assertions.expectTextDisplayed(TEST_ADDRESSES.Bob.shortAddress);

        // Add Charlie
        await SampleFeatureView.enterPetNameAddress(
          TEST_ADDRESSES.Charlie.address,
        );
        await SampleFeatureView.enterPetNameName('Charlie');
        await SampleFeatureView.tapAddPetNameButton();

        // Verify Charlie appears with correct short address
        await Assertions.expectTextDisplayed('Charlie');
        await Assertions.expectTextDisplayed(
          TEST_ADDRESSES.Charlie.shortAddress,
        );

        // Verify all pet names are visible
        await Assertions.expectTextDisplayed('Alice');
        await Assertions.expectTextDisplayed('Bob');
        await Assertions.expectTextDisplayed('Charlie');
      },
    );
  });
});
