import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { useParams } from '../../../../util/navigation/navUtils';
import { GroupedDeFiPositions } from '@metamask/assets-controllers';
import { useNavigation } from '@react-navigation/native';
import { getDeFiProtocolPositionsDetailsNavbarOptions } from '../../Navbar';

const DefiProtocolPositionsDetails = () => {
  const navigation = useNavigation();
  const xxx = useParams<GroupedDeFiPositions['protocols'][number]>();

  useEffect(() => {
    navigation.setOptions(
      getDeFiProtocolPositionsDetailsNavbarOptions(navigation),
    );
  }, [navigation]);

  return (
    <View>
      <Text>Defi Protocol Details</Text>
    </View>
  );
};

export default DefiProtocolPositionsDetails;
