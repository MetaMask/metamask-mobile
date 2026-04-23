import { useCallback, useState } from 'react';
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

const OAUTH2_LOGIN_STEP: CardAuthStep = { type: 'oauth2' };

export const useCardAuth = () => {
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] =
    useState<CardAuthStep>(OAUTH2_LOGIN_STEP);

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
        setCurrentStep(OAUTH2_LOGIN_STEP);
        if (result.done) {
          queryClient.invalidateQueries({ queryKey: cardQueries.keys.all() });
        }
      } else if (result.nextStep) {
        setCurrentStep(result.nextStep);
      } else {
        setCurrentStep(OAUTH2_LOGIN_STEP);
      }
    },
    retry: false,
  });

  const logout = useMutation({
    mutationKey: cardQueries.auth.keys.logout(),
    mutationFn: () => getController().logout(),
    onSuccess: () => {
      setCurrentStep(OAUTH2_LOGIN_STEP);
      queryClient.removeQueries({ queryKey: cardQueries.keys.all() });
    },
    retry: false,
  });

  const resetToLogin = useCallback(() => {
    setCurrentStep(OAUTH2_LOGIN_STEP);
    initiate.reset();
    submit.reset();
  }, [initiate, submit]);

  return {
    currentStep,
    initiate,
    submit,
    logout,
    resetToLogin,
    getErrorMessage: getCardProviderErrorMessage,
  };
};
