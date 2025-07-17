import SampleFeatureView from '../pages/SampleFeatureView';
import { Regression } from '../../../../../e2e/tags';
import TestHelpers from '../../../../../e2e/helpers';
import Gestures from '../../../../../e2e/utils/Gestures';
import FixtureBuilder from '../../../../../e2e/fixtures/fixture-builder';
import {
  loadFixture,
  startFixtureServer,
  stopFixtureServer,
} from '../../../../../e2e/fixtures/fixture-helper';
import { getFixturesServerPort } from '../../../../../e2e/fixtures/utils';
import FixtureServer from '../../../../../e2e/fixtures/fixture-server';
import { navigateToSampleFeature } from '../utils';
import Assertions from '../../../../../e2e/utils/Assertions';

const fixtureServer = new FixtureServer();

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

describe(Regression('Sample Feature - Pet Names'), () => {
  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
    const fixture = new FixtureBuilder().build();
    await startFixtureServer(fixtureServer);
    await loadFixture(fixtureServer, { fixture });
    await TestHelpers.launchApp({
      launchArgs: { fixtureServerPort: `${getFixturesServerPort()}` },
    });
    await navigateToSampleFeature();
  });

  afterAll(async () => {
    await stopFixtureServer(fixtureServer);
  });

  it('displays pet names section', async () => {
    // Verify Pet Names form is visible
    await Assertions.checkIfVisible(SampleFeatureView.petNameAddressInput);
    await Assertions.checkIfVisible(SampleFeatureView.petNameNameInput);
    await Assertions.checkIfVisible(SampleFeatureView.addPetNameButton);
  });

  it('creates a new pet name', async () => {
    // Clear fields
    await Gestures.clearField(SampleFeatureView.petNameAddressInput);
    await Gestures.clearField(SampleFeatureView.petNameNameInput);

    // Enter valid address and name
    await SampleFeatureView.enterPetNameAddress(TEST_ADDRESSES.Alice.address);
    await SampleFeatureView.enterPetNameName('Alice');

    // Tap add button
    await SampleFeatureView.tapAddPetNameButton();

    // Verify the pet name appears in the list
    await Assertions.checkIfTextIsDisplayed('Alice');
    await Assertions.checkIfTextIsDisplayed(TEST_ADDRESSES.Alice.shortAddress);
  });

  it('creates multiple pet names', async () => {
    // Add Bob
    await SampleFeatureView.enterPetNameAddress(TEST_ADDRESSES.Bob.address);
    await SampleFeatureView.enterPetNameName('Bob');
    await SampleFeatureView.tapAddPetNameButton();

    // Verify Bob appears with correct short address
    await Assertions.checkIfTextIsDisplayed('Bob');
    await Assertions.checkIfTextIsDisplayed(TEST_ADDRESSES.Bob.shortAddress);

    // Add Charlie
    await SampleFeatureView.enterPetNameAddress(TEST_ADDRESSES.Charlie.address);
    await SampleFeatureView.enterPetNameName('Charlie');
    await SampleFeatureView.tapAddPetNameButton();

    // Verify Charlie appears with correct short address
    await Assertions.checkIfTextIsDisplayed('Charlie');
    await Assertions.checkIfTextIsDisplayed(
      TEST_ADDRESSES.Charlie.shortAddress,
    );

    // Verify all pet names are visible
    await Assertions.checkIfTextIsDisplayed('Alice');
    await Assertions.checkIfTextIsDisplayed('Bob');
    await Assertions.checkIfTextIsDisplayed('Charlie');
  });
});
