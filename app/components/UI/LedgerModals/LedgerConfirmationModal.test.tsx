import { shallow } from 'enzyme';
import { renderScreen } from '../../../util/test/renderWithProvider';
import LedgerConfirmationModal from './LedgerConfirmationModal';


describe('LedgerConfirmationModal', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <LedgerConfirmationModal onConfirmation={jest.fn()} onRejection={jest.fn()} deviceId={'test'} />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
