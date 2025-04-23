import { seedlessOnboardingControllerInit } from '.';
import { ExtendedControllerMessenger } from '../../../ExtendedControllerMessenger';
import { buildControllerInitRequestMock } from '../../utils/test-utils';
import { ControllerInitRequest } from '../../types';
import { SeedlessOnboardingController, SeedlessOnboardingControllerMessenger, SeedlessOnboardingControllerState } from '@metamask/seedless-onboarding-controller';


jest.mock('@metamask/seedless-onboarding-controller', () => {
    const actualSeedlessOnboardingController = jest.requireActual('@metamask/seedless-onboarding-controller');
    return {
      controllerName: actualSeedlessOnboardingController.controllerName,
      // getDefaultSeedlessOnboardingControllerState,
        // actualSeedlessOnboardingController.getDefaultSeedlessOnboardingControllerState,
      SeedlessOnboardingController: jest.fn(),
      Web3AuthNetwork : actualSeedlessOnboardingController.Web3AuthNetwork
    };
});

describe('seedless onboarding controller init', () => {
    const seedlessOnboardingControllerClassMock = jest.mocked(SeedlessOnboardingController);
    let initRequestMock: jest.Mocked<
      ControllerInitRequest<SeedlessOnboardingControllerMessenger>
    >;

    beforeEach(() => {
      jest.resetAllMocks();
      const baseControllerMessenger = new ExtendedControllerMessenger();
      // Create controller init request mock
      initRequestMock = buildControllerInitRequestMock(baseControllerMessenger);
    });

    it('returns controller instance', () => {
      expect(seedlessOnboardingControllerInit(initRequestMock).controller).toBeInstanceOf(
        SeedlessOnboardingController,
      );
    });

    // it('controller state should be default state when no initial state is passed in', () => {
    //   const defaultSeedlessOnboardingControllerState = jest
    //     .requireActual('@metamask/seedless-onboarding-controller')
    //     .getDefaultSeedlessOnboardingControllerState();

    //   seedlessOnboardingControllerInit(initRequestMock);

    //   const seedlessOnboardingControllerState = seedlessOnboardingControllerClassMock.mock.calls[0][0].state;

    //   expect(seedlessOnboardingControllerState).toEqual(defaultSeedlessOnboardingControllerState);
    // });

    it('controller state should be initial state when initial state is passed in', () => {
      const initialSeedlessOnboardingControllerState: Partial<SeedlessOnboardingControllerState> = {
        vault: undefined,
        nodeAuthTokens: undefined,
        backupHashes: [],
      };

      initRequestMock.persistedState = {
        ...initRequestMock.persistedState,
        SeedlessOnboardingController: initialSeedlessOnboardingControllerState,
      };

      seedlessOnboardingControllerInit(initRequestMock);

      const seedlessOnboardingControllerState = seedlessOnboardingControllerClassMock.mock.calls[0][0].state;

      expect(seedlessOnboardingControllerState).toStrictEqual(initialSeedlessOnboardingControllerState);
    });
});
