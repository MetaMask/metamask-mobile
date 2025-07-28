import React from 'react';
import { RampSDKProvider } from '../Aggregator/sdk';
import { DepositSDKProvider } from '../Deposit/sdk';

function withRampAndDepositSDK(Component: React.ComponentType) {
  return (props: Record<string, unknown>) => (
    <DepositSDKProvider>
      <RampSDKProvider>
        <Component {...props} />
      </RampSDKProvider>
    </DepositSDKProvider>
  );
}
export default withRampAndDepositSDK;
