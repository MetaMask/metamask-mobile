import React from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Text, {
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import Button, {
  ButtonVariants,
} from '../../../../../../component-library/components/Buttons/Button';
import Routes from '../../../../../../constants/navigation/Routes';
import { useTheme } from '../../../../../../util/theme';
export const ACTIONS = [
  {
    id: '1',
    title: 'Complete a transaction',
    description: 'Complete a transaction of > $10 using Swap',
    navigateTo: Routes.SWAPS,
    btnTitle: 'Swap',
  },
  {
    id: '2',
    title: 'Buy a crypto',
    description: ' Buy a crypto using MetaMask and earn rewards',
    navigateTo: Routes.RAMP.BUY,
    btnTitle: 'Buy',
  },
  {
    id: '3',
    title: 'Invite a friend',
    description: 'Invite friends to join MetaMask and earn rewards',
    navigateTo: Routes.WEBVIEW.SIMPLE,
    btnTitle: 'Invite',
  },
];

const styleSheet = (colors: any) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.background.alternative,
      width: 160,
      height: 136,
      marginRight: 8,
      marginVertical: 12,
      borderRadius: 16,
    },
    content: {
      flex: 1,
      padding: 8,
      justifyContent: 'center',
      alignItems: 'flex-start',
    },
    button: {
      height: 24,
      bottom: 8,
      alignSelf: 'center',
      width: '90%',
    },
  });

const renderItem = ({
  item,
  styles,
  navigation,
}: {
  item: any;
  styles: any;
  navigation: any;
}) => (
  <View style={styles.container}>
    <View style={styles.content}>
      <Text variant={TextVariant.BodySMBold}>{item.title}</Text>
      <Text variant={TextVariant.BodyXS}>{item.description}</Text>
    </View>
    <Button
      style={styles.button}
      variant={ButtonVariants.Primary}
      label={item.btnTitle}
      onPress={() => navigation.navigate(item.navigateTo)}
    />
  </View>
);

const HorizontalCarousel = () => {
  const { colors } = useTheme();
  const styles = styleSheet(colors);
  const navigation = useNavigation();
  return (
    <>
      <Text variant={TextVariant.HeadingMD}>Welcome Tasks</Text>
      <FlatList
        data={ACTIONS}
        renderItem={({ item }) => renderItem({ item, styles, navigation })}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
      />
    </>
  );
};

export default HorizontalCarousel;
