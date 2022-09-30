import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { strings } from '../../../../../../locales/i18n';
import Alert, { AlertType } from '../../../../Base/Alert';
import { useTheme } from '../../../../../util/theme';
import { CHAINLIST_URL } from '../../../../../constants/urls';
import Routes from '../../../../../constants/navigation/Routes';

const createStyles = (colors: any) =>
  StyleSheet.create({
    wrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
    },
    container: { marginHorizontal: 10, marginTop: 20, paddingRight: 0 },
    emptyDescriptionText: { color: colors.text.default },
    link: { color: colors.primary.default },
  });

interface Props {
  goToCustomNetwork: () => void;
}

const EmptyPopularList = ({ goToCustomNetwork }: Props) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const navigation = useNavigation();

  const goToBrowserTab = () => {
    navigation.navigate('BrowserTabHome', {
      screen: Routes.BROWSER.VIEW,
      params: {
        newTabUrl: CHAINLIST_URL,
        timestamp: Date.now(),
      },
    });
  };

  return (
    <Alert type={AlertType.Info} style={styles.container}>
      <>
        <Text style={styles.emptyDescriptionText}>{`${strings(
          'networks.empty_popular_networks',
        )} `}</Text>
        <Text style={styles.link} onPress={goToBrowserTab}>{`${strings(
          'networks.add_other_network_here',
        )} `}</Text>
        <Text style={styles.emptyDescriptionText}>{`${strings(
          'networks.you_can',
        )} `}</Text>
        <Text
          suppressHighlighting
          onPress={goToCustomNetwork}
          style={styles.link}
        >
          {strings('networks.add_network')}
        </Text>
      </>
    </Alert>
  );
};

export default EmptyPopularList;
