import { NavigationProp, ParamListBase } from '@react-navigation/native';

export interface Props {
  /**
   * navigation object required to push new views
   */
  navigation: NavigationProp<ParamListBase>;
}
