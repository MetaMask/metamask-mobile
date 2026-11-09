import '../mocks';
import React, { useCallback, useRef } from 'react';
import { TextInput } from 'react-native';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import {
  createRouteParamsProbe,
  getRouteParamsProbeTestId,
  renderScreenWithRoutes,
} from '../render';
import Routes from '../../../app/constants/navigation/Routes';
import UrlAutocomplete, {
  UrlAutocompleteCategory,
  type AutocompleteSearchResult,
  type UrlAutocompleteRef,
} from '../../../app/components/UI/UrlAutocomplete';
import { usePredictEntryActions } from '../../../app/components/UI/PredictNext';
import { initialStateTrending } from '../presets/trending';

export const URL_AUTOCOMPLETE_ROUTE = 'UrlAutocompleteProbe';
export const URL_AUTOCOMPLETE_QUERY_INPUT = 'url-autocomplete-query-input';
export const PREDICT_ROOT_PARAMS_PROBE = getRouteParamsProbeTestId(
  Routes.PREDICT.ROOT,
);

/**
 * Browser's URL bar and autocomplete without the WebView: typing searches
 * the real UrlAutocomplete, and a Predictions result opens its intent as
 * BrowserTab's `onSelect` does.
 */
const UrlAutocompleteScreen = () => {
  const autocompleteRef = useRef<UrlAutocompleteRef>(null);
  const { openPredict } = usePredictEntryActions();

  const onChangeText = useCallback((text: string) => {
    autocompleteRef.current?.show();
    autocompleteRef.current?.search(text);
  }, []);

  const onSelect = useCallback(
    (item: AutocompleteSearchResult) => {
      if (item.category === UrlAutocompleteCategory.Predictions) {
        openPredict(item.intent);
      }
    },
    [openPredict],
  );

  return (
    <>
      <TextInput
        testID={URL_AUTOCOMPLETE_QUERY_INPUT}
        onChangeText={onChangeText}
      />
      <UrlAutocomplete
        ref={autocompleteRef}
        onSelect={onSelect}
        onDismiss={() => undefined}
      />
    </>
  );
};

interface RenderUrlAutocompleteOptions {
  overrides?: DeepPartial<RootState>;
}

/**
 * Renders Browser URL autocomplete with a params probe on the Predict root,
 * so a test can assert where a Predictions result press navigates.
 */
export function renderUrlAutocompleteWithRoutes({
  overrides,
}: RenderUrlAutocompleteOptions = {}): ReturnType<
  typeof renderScreenWithRoutes
> {
  const builder = initialStateTrending();
  if (overrides) {
    builder.withOverrides(overrides);
  }

  return renderScreenWithRoutes(
    UrlAutocompleteScreen,
    { name: URL_AUTOCOMPLETE_ROUTE },
    [
      {
        name: Routes.PREDICT.ROOT,
        Component: createRouteParamsProbe(Routes.PREDICT.ROOT),
      },
    ],
    { state: builder.build() },
  );
}
