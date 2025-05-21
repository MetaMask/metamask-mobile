import { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../../constants/navigation/Routes';

// This page is used only as a router based on the user's state
const Root = () => {
  const navigation = useNavigation();

  // All users will see the build quote page first
  useEffect(() => {
    navigation.reset({
      index: 0,
      routes: [{ name: Routes.DEPOSIT.BUILD_QUOTE }],
    });
  });

  useEffect(() => {
    // check vault storage for providerFrontendAuth and if it exists, query transak for account state
    // if the query is successful, replace providerFrontendAuth with the new one
  });

  return null;
};

export default Root;
