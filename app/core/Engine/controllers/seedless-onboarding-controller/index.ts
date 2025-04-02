import { AuthenticationParams, AuthenticationResult } from '@metamask/seedless-onboarding-controller/dist/ToprfClient.cjs';
import Logger from '../../../../util/Logger';
import type { ControllerInitFunction } from '../../types';
import {
  SeedlessOnboardingController,
  SeedlessOnboardingControllerState,
  type SeedlessOnboardingControllerMessenger,
} from '@metamask/seedless-onboarding-controller';
import { keccak_256 } from '@noble/hashes/sha3';
import { secp256k1 } from '@metamask/key-tree';



const getDefaultSeedlessOnboardingControllerState = () : SeedlessOnboardingControllerState => ({
  nodeAuthTokens: undefined,
  hasValidEncryptionKey: false,
});


/**
 * Initialize the SeedlessOnboardingController.
 *
 * @param request - The request object.
 * @returns The SeedlessOnboardingController.
 */
export const seedlessOnboardingControllerInit: ControllerInitFunction<
  SeedlessOnboardingController,
  SeedlessOnboardingControllerMessenger
> = (request) => {
  const { controllerMessenger, persistedState } = request;

  const seedlessOnboardingControllerState =
    persistedState.SeedlessOnboardingController ?? getDefaultSeedlessOnboardingControllerState();

  const controller = new SeedlessOnboardingController({
    messenger: controllerMessenger,
    state: seedlessOnboardingControllerState,
  });

  // overwrite function with mock implementation
  // controller.authenticateOAuthUser = async (params: AuthenticationParams) : Promise<AuthenticationResult> => {

  //   Logger.log(params);
  //   const mockKey = keccak_256.create().update(params.verifier + params.verifierID).digest();
  //   const derivedKey = secp256k1.getPublicKey(mockKey, true);
  //   const derivedKeyHex = Buffer.from(derivedKey).toString('hex');
  //   Logger.log(derivedKeyHex);

    

  //   const response = await fetch('https://node-2.dev-node.web3auth.io/metadata');
  //   const metadata = await response.json();
  //   Logger.log(metadata);
  //   // get from metadata url
  //   // https://node-2.dev-node.web3auth.io/metadata
  //   return {
  //     nodeAuthTokens: [
  //       {
  //         nodeIndex: 1,
  //         nodeAuthToken: 'nodeAuthToken',
  //       },
  //       {
  //         nodeIndex: 2,
  //         nodeAuthToken: 'nodeAuthToken',
  //       },
  //     ],
  //     hasValidEncKey: true,
  //     // existingEncKeyPublicData?: {
  //     //   pubKeyX: string;
  //     //   pubKeyY: string;
  //     //   keyIndex: number;
  //     // };
  //   };
  // };

  // controller.createEncKey = async (params: CreateEncKeyParams) : Promise<CreateEncKeyResult> => {
  //   Logger.log(params);
  //   return {
  //     encKey: 'encKey',
  //   };
  // };

  // controller.fetchAndRestoreSeedPhraseMetadata = async () => {
  //   Logger.log('fetchAndRestoreSeedPhraseMetadata');
  // }

  return { controller };
};
