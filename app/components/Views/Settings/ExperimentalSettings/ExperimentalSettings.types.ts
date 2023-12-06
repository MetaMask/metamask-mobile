import { IconName } from '../../../../component-library/components/Icons/Icon';

export interface Props {
  /**
	/* navigation object required to push new views
	*/
  navigation: any;
  /**
   * contains params that are passed in from navigation
   */
  route: any;
}

export interface BlockaidIndicatorProps {
  title: string;
  description: string;
  iconName: IconName;
  iconColor: string;
  showButton?: boolean;
}
