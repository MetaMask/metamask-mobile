import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Engine from '../../../../core/Engine';
import { cardQueries } from '../queries';
import {
  CardAuthStep,
  CardCredentials,
} from '../../../../core/Engine/controllers/card-controller/provider-types';
import { getCardProviderErrorMessage } from '../util/getCardProviderErrorMessage';

function getController() {
  const controller = Engine.context?.CardController;
  if (!controller) {
    throw new Error('CardController not initialized');
  }
  return controller;
}

const LOGIN_STEP: CardAuthStep = { type: 'email_password' };

export const useCardAuth = () => {
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState<CardAuthStep>(LOGIN_STEP);

  const initiate = useMutation({
    mutationKey: cardQueries.auth.keys.initiate(),
    mutationFn: (country: string) => getController().initiateAuth(country),
    retry: false,
  });

  const submit = useMutation({
    mutationKey: cardQueries.auth.keys.submit(),
    mutationFn: (credentials: CardCredentials) =>
      getController().submitCredentials(credentials),
    onSuccess: (result) => {
      if (result.done || result.onboardingRequired) {
        setCurrentStep(LOGIN_STEP);
        if (result.done) {
          queryClient.invalidateQueries({ queryKey: cardQueries.keys.all() });
        }
      } else if (result.nextStep) {
        setCurrentStep(result.nextStep);
      } else {
        // Controller cleared session (done:false without nextStep/onboardingRequired)
        setCurrentStep(LOGIN_STEP);
      }
    },
    retry: false,
  });

  const stepAction = useMutation({
    mutationKey: cardQueries.auth.keys.stepAction(),
    mutationFn: () => getController().executeStepAction(),
    retry: false,
  });

  const logout = useMutation({
    mutationKey: cardQueries.auth.keys.logout(),
    mutationFn: () => getController().logout(),
    onSuccess: () => {
      setCurrentStep(LOGIN_STEP);
      queryClient.removeQueries({ queryKey: cardQueries.keys.all() });
    },
    retry: false,
  });

  return {
    currentStep,
    initiate,
    submit,
    stepAction,
    logout,
    getErrorMessage: getCardProviderErrorMessage,
  };
};
