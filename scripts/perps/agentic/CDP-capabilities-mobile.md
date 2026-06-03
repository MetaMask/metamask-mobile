# Mobile CDP bridge capabilities

Mobile keeps a small product-side bridge for local development builds. External
Recipe v1 runners use this bridge to implement portable actions.

Supported bridge commands include:

- route/status inspection;
- navigation and back navigation;
- selected-account reads and account switching;
- testID press, input, and scroll helpers;
- screenshot capture through the companion shell script;
- Hermes profiler start/stop;
- console/error issue capture for validation evidence.

Recipe files, capability smokes, and action manifests live in the external
MetaMask recipe runner, not in this Mobile repository.
