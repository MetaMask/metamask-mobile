import { useEffect, useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../../constants/navigation/Routes';
import { useDepositSDK } from '../../sdk';

const Root = () => {
  const navigation = useNavigation();

  const [initialRoute, setInitialRoute] = useState<string | null>(null);
  const { checkExistingToken } = useDepositSDK();
  const hasCheckedToken = useRef(false);

  useEffect(() => {
    const initializeFlow = async () => {
      if (hasCheckedToken.current) return;

      const hasToken = await checkExistingToken();
      setInitialRoute(
        hasToken ? Routes.DEPOSIT.VERIFY_IDENTITY : Routes.DEPOSIT.BUILD_QUOTE,
      );
      hasCheckedToken.current = true;
    };

    initializeFlow();
  }, [checkExistingToken]);

  useEffect(() => {
    if (initialRoute === null) return;
    navigation.reset({
      index: 0,
      routes: [{ name: initialRoute, params: { animationEnabled: false } }],
    });
  });

  return null;
};

export default Root;
