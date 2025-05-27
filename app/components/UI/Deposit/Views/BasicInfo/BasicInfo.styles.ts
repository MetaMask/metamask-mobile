import { StyleSheet } from 'react-native';

const styleSheet = () =>
  StyleSheet.create({
    heading: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 20,
      textAlign: 'center',
      marginTop: 20,
    },
    nameInputRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 16,
    },
    nameInputContainer: {
      flex: 1,
    },
    fieldContainer: {
      marginBottom: 16,
    },
    field: {
      flex: 1,
      flexDirection: 'column',
      marginBottom: 16,
    },
    label: {
      fontSize: 14,
      marginBottom: 8,
      fontWeight: '500',
    },
    input: {
      borderWidth: 1,
      borderColor: '#CCCCCC',
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
    },
    errorText: {
      color: 'red',
      fontSize: 12,
      marginTop: 4,
    },
    errorPlaceholder: {
      height: 16,
    },
    buttonContainer: {
      marginTop: 20,
      marginBottom: 30,
    },
  });

export default styleSheet;
