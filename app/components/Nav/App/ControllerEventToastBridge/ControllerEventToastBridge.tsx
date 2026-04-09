import { useContext, useEffect, useRef } from 'react';

import { ToastContext } from '../../../../component-library/components/Toast';
import type { ToastRef } from '../../../../component-library/components/Toast/Toast.types';
import Engine from '../../../../core/Engine';

import type {
  ControllerEventToastBridgeProps,
  ToastRegistration,
} from './ControllerEventToastBridge.types';

interface ControllerMessengerLike {
  subscribe: (eventName: string, handler: (payload: unknown) => void) => void;
  unsubscribe: (eventName: string, handler: (payload: unknown) => void) => void;
}

const noopShowToast: ToastRef['showToast'] = () => undefined;

const ControllerEventToastBridge = ({
  registrations,
}: ControllerEventToastBridgeProps) => {
  const { toastRef } = useContext(ToastContext);
  const unsubscribeHandlersRef = useRef<(() => void)[]>([]);
  const controllerMessenger =
    Engine.controllerMessenger as unknown as ControllerMessengerLike;

  useEffect(() => {
    const cleanupPrevious = () => {
      unsubscribeHandlersRef.current.forEach((fn) => fn());
      unsubscribeHandlersRef.current = [];
    };

    cleanupPrevious();

    unsubscribeHandlersRef.current = registrations.map(
      ({ eventName, handler }: ToastRegistration) => {
        const subscriptionHandler = (payload: unknown) => {
          handler(payload, toastRef?.current?.showToast ?? noopShowToast);
        };

        controllerMessenger.subscribe(eventName, subscriptionHandler);

        return () =>
          controllerMessenger.unsubscribe(eventName, subscriptionHandler);
      },
    );

    return cleanupPrevious;
  }, [controllerMessenger, registrations, toastRef]);

  return null;
};

export default ControllerEventToastBridge;
