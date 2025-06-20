import React, { useEffect, useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../../../constants/navigation/Routes';
import { useDepositSDK } from '../../sdk';
import GetStarted from './GetStarted/GetStarted';

const Root = () => {
  const navigation = useNavigation();
  const [initialRoute] = useState<string>(Routes.DEPOSIT.BUILD_QUOTE);
  const { checkExistingToken, getStarted } = useDepositSDK();
  const hasCheckedToken = useRef(false);

  useEffect(() => {
    const initializeFlow = async () => {
      if (hasCheckedToken.current) return;
      await checkExistingToken();
      hasCheckedToken.current = true;
    };
    initializeFlow();
  }, [checkExistingToken]);

  useEffect(() => {
    if (initialRoute === null || !getStarted) return;
    navigation.reset({
      index: 0,
      routes: [{ name: initialRoute, params: { animationEnabled: false } }],
    });
  }, [getStarted, initialRoute, navigation]);

  return <GetStarted />;
};

export default Root;
