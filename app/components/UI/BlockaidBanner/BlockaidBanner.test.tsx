import { fireEvent, render } from '@testing-library/react-native';
import BlockaidBanner from './BlockaidBanner';
import { Text } from 'react-native-svg';
import ListItem from '../../../components/Base/ListItem';
import { FlatList } from 'react-native-gesture-handler';
import FontAwesome5Icon from 'react-native-vector-icons/FontAwesome5';
import { StyleSheet } from 'react-native';

describe('BlockaidBanner', () => {
  const listItems = [
    {
      title: 'attack_description_1',
      description: 'We found attack vectors in this request',
    },
    {
      title: 'attack_description_2',
      description: 'This request shows a fake token name and icon.',
    },
    {
      title: 'attack_description_3',
      description:
        'If you approve this request, a third party known for scams might take all your assets.',
    },
  ];

  const styles = StyleSheet.create({
    wrapper: {
      padding: 15,
    },
  });

  it('should render correctly', () => {
    const wrapper = render(
      <BlockaidBanner
        flagType="warning"
        attackType="approval_farming"
        attackDetails="This is a string attack details"
      />,
    );

    expect(wrapper).toMatchSnapshot();
  });

  it('should render correctly with attackType "raw_signature_farming"', async () => {
    const wrapper = render(
      <BlockaidBanner
        flagType="malicious"
        attackType="raw_signature_farming"
        attackDetails="This is a string attack details"
      />,
    );

    expect(wrapper).toMatchSnapshot();
    expect(await wrapper.queryByTestId('accordion-header')).toBeDefined();
    expect(
      await wrapper.getByText('This is a suspicious request'),
    ).toBeDefined();
    expect(
      await wrapper.getByText(
        'If you approve this request, you might lose your assets.',
      ),
    ).toBeDefined();
  });

  it('should render correctly with string attack details', async () => {
    const wrapper = render(
      <BlockaidBanner
        flagType="malicious"
        attackType="approval_farming"
        attackDetails="This is a string attack details"
      />,
    );

    expect(wrapper).toMatchSnapshot();
    expect(await wrapper.queryByTestId('accordion-header')).toBeDefined();
    expect(
      await wrapper.queryByText('This is a string attack details'),
    ).toBeNull();
    fireEvent.press(await wrapper.getByText('See details'));
    expect(
      await wrapper.getByText('This is a string attack details'),
    ).toBeDefined();
  });

  it('should render correctly with list attack details', async () => {
    const wrapper = render(
      <BlockaidBanner
        flagType="malicious"
        attackType="approval_farming"
        attackDetails={
          <>
            <FlatList
              data={listItems}
              renderItem={({ item }) => (
                <ListItem style={styles}>
                  <ListItem.Content style={styles}>
                    <ListItem.Icon style={styles}>
                      <FontAwesome5Icon name="dot-circle" size={25} />
                    </ListItem.Icon>
                    <ListItem.Body style={styles}>
                      <Text>{item.description}</Text>
                    </ListItem.Body>
                  </ListItem.Content>
                </ListItem>
              )}
              keyExtractor={(item) => item.title}
            />
          </>
        }
      />,
    );

    expect(wrapper).toMatchSnapshot();
    expect(await wrapper.queryByTestId('accordion-header')).toBeDefined();
    expect(await wrapper.queryByTestId('accordion-content')).toBeNull();

    fireEvent.press(await wrapper.getByText('See details'));

    expect(await wrapper.queryByTestId('accordion-content')).toBeDefined();
    expect(
      await wrapper.queryByText('We found attack vectors in this request'),
    ).toBeDefined();
    expect(
      await wrapper.queryByText(
        'This request shows a fake token name and icon.',
      ),
    ).toBeDefined();
    expect(
      await wrapper.queryByText(
        'If you approve this request, a third party known for scams might take all your assets.',
      ),
    ).toBeDefined();
  });
});
