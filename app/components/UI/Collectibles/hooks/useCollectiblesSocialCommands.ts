import { useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import Engine from '../../../../core/Engine';
import type { CollectiblesSocialApiClient } from '../services/clients/CollectiblesSocialApiClient';
import { usePackPartnerAccount } from '../providers/pack-partner/hooks/usePackPartnerAccount';
import { collectiblesDataScope } from '../services/data/queryKeys';
import { useCollectiblesPresentation } from './useCollectiblesPresentation';

type Request<Method extends keyof CollectiblesSocialApiClient> = Parameters<
  CollectiblesSocialApiClient[Method]
>[0];

/** Commands use the current viewer scope; cache policy belongs entirely to the service. */
function useSocialCommand<RequestValue, Result>(
  execute: (scope: string, request: RequestValue) => Promise<Result>,
  targetIdentity = '',
) {
  const { online } = useCollectiblesPresentation();
  const account = usePackPartnerAccount();
  const scope = collectiblesDataScope(account);
  const enabled = online && Boolean(account);
  const inFlight = useRef<Promise<Result> | undefined>(undefined);
  const identity = `${scope}:${targetIdentity}`;
  const activeIdentity = useRef(identity);
  activeIdentity.current = identity;
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const mutation = useMutation({
    retry: false,
    mutationFn: (request: RequestValue) => {
      if (!enabled) {
        return Promise.reject(
          new Error(
            'Social is unavailable while offline or without an account.',
          ),
        );
      }
      if (inFlight.current) {
        return Promise.reject(
          new Error('A Social command is already pending.'),
        );
      }
      const operation = execute(scope, request).then((result) => {
        // The write still belongs to its original account. A stale completion
        // must not close or acknowledge a different account/target's view.
        if (!mounted.current || activeIdentity.current !== identity) {
          throw new Error('The Social command view has changed.');
        }
        return result;
      });
      inFlight.current = operation;
      return operation.finally(() => {
        if (inFlight.current === operation) inFlight.current = undefined;
      });
    },
  });
  return { ...mutation, enabled };
}

export function useCollectiblesAddComment() {
  return useSocialCommand((scope, request: Request<'addComment'>) =>
    Engine.context.CollectiblesSocialApiDataService.addComment(scope, request),
  );
}

export function useCollectiblesSetReaction() {
  return useSocialCommand((scope, request: Request<'setReaction'>) =>
    Engine.context.CollectiblesSocialApiDataService.setReaction(scope, request),
  );
}

export function useCollectiblesShareCards() {
  return useSocialCommand((scope, request: Request<'shareCards'>) =>
    Engine.context.CollectiblesSocialApiDataService.shareCards(scope, request),
  );
}

export function useCollectiblesFollow(profileId: string) {
  return useSocialCommand(
    (scope, following: boolean) =>
      Engine.context.CollectiblesSocialApiDataService.setFollow(scope, {
        profileId,
        following,
      }),
    profileId,
  );
}
