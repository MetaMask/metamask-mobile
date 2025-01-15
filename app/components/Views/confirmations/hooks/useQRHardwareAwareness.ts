import { useState, useEffect } from 'react';

import Engine from '../../../../core/Engine';
import { IQRState } from '../../../UI/QRHardware/types';

const useQRHardwareAwareness = () => {
  const [qrState, setQRState] = useState<IQRState>({
    sync: {
      reading: false,
    },
    sign: {},
  });

  const subscribe = (value: IQRState) => {
    setQRState(value);
  };

  useEffect(() => {
    Engine.context.KeyringController.getOrAddQRKeyring();
    Engine.controllerMessenger.subscribe(
      'KeyringController:qrKeyringStateChange',
      subscribe,
    );
    return () => {
      Engine.controllerMessenger.unsubscribe(
        'KeyringController:qrKeyringStateChange',
        subscribe,
      );
    };
  }, []);

  return {
    isSigningQRObject: !!qrState.sign?.request,
    isSyncingQRHardware: qrState.sync.reading,
  };
};

export default useQRHardwareAwareness;
