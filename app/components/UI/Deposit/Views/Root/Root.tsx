import { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../../constants/navigation/Routes';

const Root = () => {
  const navigation = useNavigation();

  useEffect(() => {
    navigation.reset({
      index: 0,
      routes: [{ name: Routes.DEPOSIT.BASIC_INFO }],
    });
  });

  return null;
};

export default Root;
