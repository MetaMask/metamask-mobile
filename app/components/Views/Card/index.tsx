import React, { useEffect } from 'react';
import { View } from 'react-native';

import styles from './styles';
import { IconName } from '../../../component-library/components/Icons/Icon';

import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import Routes from '../../../constants/navigation/Routes';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../component-library/components/Buttons/ButtonIcon';
import CardAssetList from '../../UI/Card/CardAssetList/CardAssetList';
import { useSelector } from 'react-redux';
import { selectCardFeature } from '../../../selectors/featureFlagController/card';
import { selectSelectedInternalAccountFormattedAddress } from '../../../selectors/accountsController';
import { isCardHolder } from '../../UI/Card/card.utils';
import { selectChainId } from '../../../selectors/networkController';
import Logger from '../../../util/Logger';
import Loader from '../../../component-library/components-temp/Loader';

const CardView = () => {
  const selectedAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );
  const [loading, setLoading] = React.useState<boolean>(true);
  const [isCardholder, setIsCardholder] = React.useState<boolean>(false);
  const cardFeature = useSelector(selectCardFeature);
  const chainId = useSelector(selectChainId);
  const fakeAccount = false;

  useEffect(() => {
    const checkCardHolder = async () => {
      if (selectedAddress && cardFeature) {
        try {
          const isHolder = await isCardHolder(
            fakeAccount
              ? '0xFe4F94B62C04627C2677bF46FB249321594d0d79'
              : selectedAddress,
            cardFeature,
            chainId,
          );
          setIsCardholder(isHolder);
        } catch (error) {
          Logger.error(error as Error, 'Error checking card holder status');
          setIsCardholder(false);
        } finally {
          setLoading(false);
        }
      }
    };

    checkCardHolder();
  }, [selectedAddress, chainId, fakeAccount, cardFeature]);

  if (loading) {
    return (
      <View style={styles.wrapper}>
        <Loader />
      </View>
    );
  }

  if (!isCardholder) {
    return (
      <View style={styles.wrapper}>
        <Text variant={TextVariant.BodyMD} style={styles.title}>
          You are not a cardholder.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <CardAssetList />
    </View>
  );
};

export default CardView;

CardView.navigationOptions = ({
  navigation,
}: {
  navigation: NavigationProp<ParamListBase>;
}) => ({
  headerLeft: () => (
    <ButtonIcon
      size={ButtonIconSizes.Md}
      iconName={IconName.Close}
      onPress={() => navigation.navigate(Routes.WALLET.HOME)}
      style={styles.icon}
    />
  ),
  headerTitle: () => (
    <Text
      variant={TextVariant.HeadingMD}
      style={styles.title}
      testID={'card-view-title'}
    >
      Card
    </Text>
  ),
  headerRight: () => (
    <ButtonIcon
      size={ButtonIconSizes.Md}
      iconName={IconName.Setting}
      onPress={() => navigation.navigate(Routes.SETTINGS.NOTIFICATIONS)}
      style={styles.icon}
    />
  ),
});
