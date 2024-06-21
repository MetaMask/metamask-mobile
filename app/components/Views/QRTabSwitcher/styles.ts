const createStyles = (theme: any) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  overlayContainerColumn: {
    flexDirection: 'column',
    justifyContent: 'flex-start',
  },
  overlay: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 10,
  },
  closeIcon: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  segmentedControlContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f7f7f7',
    marginHorizontal: 10,
    borderRadius: 25,
    height: 40,
    overflow: 'hidden',
    marginVertical: 10,
  },
  segmentedControlItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
  },
  segmentedControlItemSelected: {
    backgroundColor: 'white',
    borderRadius: 25,
    height: '100%',
  },
  text: {
    color: '#000',
    fontWeight: 'bold',
  },
  selectedText: {
    color: '#000',
    fontWeight: 'bold',
  },
});

export default createStyles;
