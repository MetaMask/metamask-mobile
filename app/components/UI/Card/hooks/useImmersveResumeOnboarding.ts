import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { setImmersveFundingSourceId } from '../../../../core/redux/slices/card';
import { selectCardFeatureFlag } from '../../../../selectors/featureFlagController/card';
import { KYC_REDIRECT_URL } from '../constants';
import { deriveNextImmersveAction } from '../util/immersvePrerequisites';
import { resolveImmersveFundingSourceId } from '../util/immersveResume';
import { useImmersveSiweAuth } from './useImmersveSiweAuth';
import { useImmersveOnboardingRouter } from './useImmersveOnboardingRouter';

interface ResumeParams {
  country: string;
  address: string;
  email?: string;
  showAccountExistsToast?: boolean;
  navigateFromRoot?: boolean;
}

export const useImmersveResumeOnboarding = () => {
  const dispatch = useDispatch();
  const { signIn } = useImmersveSiweAuth();
  const route = useImmersveOnboardingRouter();
  const cardFeatureFlag = useSelector(selectCardFeatureFlag);

  return useCallback(
    async ({
      country,
      address,
      email,
      showAccountExistsToast,
      navigateFromRoot,
    }: ResumeParams): Promise<void> => {
      const controller = Engine.context.CardController;

      controller.setSelectedCountry(country);

      await signIn({ country, address });

      const id = await resolveImmersveFundingSourceId({
        fundingChannelId: cardFeatureFlag.immersve?.fundingChannelId,
      });
      dispatch(setImmersveFundingSourceId(id));

      const { prerequisites } = await controller.getSpendingPrerequisites(id, {
        kycRegion: country,
        kycRedirectUrl: KYC_REDIRECT_URL,
      });
      route(deriveNextImmersveAction(prerequisites), {
        email,
        countryKey: country,
        showAccountExistsToast,
        navigateFromRoot,
      });
    },
    [dispatch, signIn, route, cardFeatureFlag],
  );
};
