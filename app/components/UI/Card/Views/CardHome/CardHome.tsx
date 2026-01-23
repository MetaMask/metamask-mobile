import React from 'react';
import useCardHomeState from './useCardHomeState';
import { CardHomeError, CardHomeContent } from './components';

/**
 * CardHome Component
 *
 * Main view for the MetaMask Card feature that displays:
 * - User's card balance with privacy controls
 * - Priority token information for spending
 * - Card management options (advanced management)
 *
 * This component uses a state machine pattern where `useCardHomeState`
 * derives a single `viewState` that determines which UI to render.
 *
 * View States:
 * - `loading`: Shows skeletons for card, balance, and asset
 * - `error`: An error occurred (with optional retry)
 * - `kyc_pending`: User authenticated but KYC not verified
 * - `setup_required`: User needs to enable card/delegation
 * - `ready`: Card is usable with full features
 *
 * @returns JSX element representing the card home screen
 */
const CardHome = () => {
  const state = useCardHomeState();

  switch (state.viewState.status) {
    case 'error':
      return (
        <CardHomeError
          isAuthError={state.viewState.isAuthError}
          canRetry={state.viewState.canRetry}
          onRetry={state.fetchAllData}
        />
      );

    case 'loading':
    case 'kyc_pending':
    case 'setup_required':
    case 'ready':
      return <CardHomeContent state={state} />;
  }
};

export default CardHome;
