import renderWithProvider from '../../../util/test/renderWithProvider';
import LedgerConfirmationModal from './LedgerConfirmationModal';

const mockedNavigate = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockedNavigate,
    }),
  };
});

describe('LedgerConfirmationModal', () => {
  it('render matches latest snapshot', () => {
    const {toJSON } = renderWithProvider(
      <LedgerConfirmationModal onConfirmation={jest.fn()} onRejection={jest.fn()} deviceId={'test'} />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
