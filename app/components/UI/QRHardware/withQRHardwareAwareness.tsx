import React, { useState, useEffect, ComponentClass } from 'react';
import Engine from '../../../core/Engine';
import { IQRState } from './types';

const withQRHardwareAwareness = (
  Children: ComponentClass<{
    QRState?: IQRState;
    isSigningQRObject?: boolean;
    isSyncingQRHardware?: boolean;
  }>,
) => {
  const QRHardwareAwareness = (props: any) => {
    const [QRState, SetQRState] = useState<IQRState>({
      sync: {
        reading: false,
      },
      sign: {},
    });

    const subscribeKeyringState = (value: any) => {
      SetQRState(value);
    };

    useEffect(() => {
      Engine.controllerMessenger.subscribe(
        'KeyringController:qrKeyringStateChange',
        subscribeKeyringState,
      );
      return () => {
        Engine.controllerMessenger.unsubscribe(
          'KeyringController:qrKeyringStateChange',
          subscribeKeyringState,
        );
      };
    }, []);

    return (
      <Children
        {...props}
        isSigningQRObject={!!QRState.sign?.request}
        isSyncingQRHardware={QRState.sync.reading}
        QRState={QRState}
      />
    );
  };

  return QRHardwareAwareness;
};

export default withQRHardwareAwareness;
