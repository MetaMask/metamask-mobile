import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  statusContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    gap: 16,
    padding: 16,
    width: '100%',
  },
  statusButton: {
    width: '100%',
  },
  errorDescription: {
    textAlign: 'left',
    alignSelf: 'flex-start',
    width: '100%',
  },
  errorTitle: {
    textAlign: 'center',
    alignSelf: 'center',
    width: '70%',
    marginHorizontal: 'auto',
  },
});

export default styles;
