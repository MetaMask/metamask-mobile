import React from 'react';
import { ControllersGateProps } from './types';
import { useSelector } from 'react-redux';
import { selectServicesReady } from '../../../reducers/user';
// import { useStyles } from '../../../component-library/hooks';
// import styleSheet from './styles';
import FoxLoader from '../../UI/FoxLoader';
/**
 * ControllersGate component
 * @param props - The props for the ControllersGate component
 * @param props.children - The children to render
 * @returns - The ControllersGate component
 */
const ControllersGate: React.FC<ControllersGateProps> = ({
  children,
}: ControllersGateProps) => {
  //   const { styles } = useStyles(styleSheet, {});
  const isControllersLoaded = useSelector(selectServicesReady);

  return (
    <React.Fragment>
      {isControllersLoaded ? children : <FoxLoader />}
    </React.Fragment>
  );
};

export default ControllersGate;
