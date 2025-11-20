import React from 'react';
import { ControllersGateProps } from './types';
import { useSelector } from 'react-redux';
import { selectAppServicesReady } from '../../../reducers/user/selectors';
import FoxLoader from '../../UI/FoxLoader';
/**
 * A higher order component that gate keeps the children until the app services are finished loaded
 *
 * @param props - The props for the ControllersGate component
 * @param props.children - The children to render
 * @returns - The ControllersGate component
 */
const ControllersGate: React.FC<ControllersGateProps> = ({
  children,
}: ControllersGateProps) => {
  const appServicesReady = useSelector(selectAppServicesReady);

  // Check RAW Redux state to see the actual bug
  const reduxState = useSelector((state: any) => state);
  const accountsController =
    reduxState?.engine?.backgroundState?.AccountsController;
  const backgroundStateKeys = reduxState?.engine?.backgroundState
    ? Object.keys(reduxState.engine.backgroundState)
    : [];

  console.log('🐛 [BUG DEMO - UI] ControllersGate render:', {
    appServicesReady,
    accountsControllerDefined: !!accountsController,
    backgroundStateControllerCount: backgroundStateKeys.length,
    backgroundStateKeys: backgroundStateKeys.slice(0, 5), // Show first 5
  });

  if (appServicesReady && !accountsController) {
    console.error(
      '🚨🚨🚨 RACE CONDITION 🚨🚨🚨',
      '\nappServicesReady = TRUE',
      '\nAccountsController = UNDEFINED',
      '\nbackgroundState controllers:',
      backgroundStateKeys.length,
    );
  }

  if (appServicesReady && backgroundStateKeys.length === 0) {
    console.error('🚨🚨🚨 BackgroundState is COMPLETELY EMPTY! 🚨🚨🚨');
  }

  return (
    <React.Fragment>
      {appServicesReady ? children : <FoxLoader />}
    </React.Fragment>
  );
};

export default ControllersGate;
