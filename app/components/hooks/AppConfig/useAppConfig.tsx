import { useCallback, useEffect, useState } from 'react';
import AppConfig from './AppConfig';
import { FetchState } from '../../../util/fetch/FetchState';

type State = FetchState<AppConfig>;
const initialState: Readonly<State> = {
  type: 'Loading',
};

const useAppConfig = (): State => {
  const appConfigURL =
    'https://metamask.github.io/metamask-mobile/AppConfig/v1/AppConfig.json';
  const [state, setState] = useState<State>(initialState);

  const fetchAppConfig = useCallback(() => {
    fetch(appConfigURL)
      .then((response) => response.json())
      .then((data) => {
        try {
          const minimumVersions = data.security.minimumVersions;
          const appConfig: AppConfig = {
            security: {
              minimumVersions: {
                appMinimumBuild: minimumVersions.appMinimumBuild,
                appleMinimumOS: minimumVersions.appleMinimumOS,
                androidMinimumAPIVersion:
                  minimumVersions.androidMinimumAPIVersion,
              },
            },
          };
          setState({ type: 'Success', data: appConfig });
        } catch (e: any) {
          setState({
            type: 'Error',
            error: e,
            message: `error parsing AppConfig ${e.message}`,
          });
        }
      })
      .catch((e: any) => {
        setState({
          type: 'Error',
          error: e,
          message: `error fetching AppConfig ${e.message}`,
        });
      });
  }, []);

  useEffect(() => {
    fetchAppConfig();
  }, [fetchAppConfig]);

  return state;
};

export default useAppConfig;
