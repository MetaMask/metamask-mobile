import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Engine from '../../../../core/Engine';
import { cardQueries } from '../queries';
import {
  CardAuthSession,
  CardAuthStep,
  CardCredentials,
} from '../../../../core/Engine/controllers/card-controller/provider-types';

function getController() {
  const controller = Engine.context?.CardController;
  if (!controller) {
    throw new Error('CardController not initialized');
  }
  return controller;
}

export const useCardAuth = () => {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<CardAuthSession | null>(null);

  const initiate = useMutation({
    mutationKey: cardQueries.auth.keys.initiate(),
    mutationFn: (country: string) => getController().initiateAuth(country),
    onSuccess: (newSession) => setSession(newSession),
    retry: false,
  });

  const submit = useMutation({
    mutationKey: cardQueries.auth.keys.submit(),
    mutationFn: (credentials: CardCredentials) => {
      if (!session) {
        throw new Error('No active auth session — call initiate first');
      }
      return getController().submitCredentials(session, credentials);
    },
    onSuccess: (result) => {
      if (result.done) {
        setSession(null);
        queryClient.invalidateQueries({ queryKey: cardQueries.keys.all() });
      } else if (result.nextStep) {
        setSession((s) =>
          s ? { ...s, currentStep: result?.nextStep as CardAuthStep } : null,
        );
      }
      if (result.onboardingRequired) {
        setSession(null);
      }
    },
    retry: false,
  });

  const sendOtp = useMutation({
    mutationKey: cardQueries.auth.keys.sendOtp(),
    mutationFn: () => {
      if (!session) {
        throw new Error('No active auth session');
      }
      return getController().sendOtp(session);
    },
    retry: false,
  });

  const logout = useMutation({
    mutationKey: cardQueries.auth.keys.logout(),
    mutationFn: () => getController().logout(),
    onSuccess: () => {
      setSession(null);
      queryClient.removeQueries({ queryKey: cardQueries.keys.all() });
    },
    retry: false,
  });

  return {
    session,
    initiate,
    submit,
    sendOtp,
    logout,
  };
};
