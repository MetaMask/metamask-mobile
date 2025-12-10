Cal: Lead Engineer
Alexey: Product Manager

- Switch statement for handleUniversalLink.ts in lieu of if / else statements?
- Should focus purely on the handlers

- WC shouldn't be an action, should it? What about send? Cal doesn't like that it gets parsed again(?)
- Remove v2 handlers for now

- Remove: /normalization, /registry, and /handler
- LegacyLinkAdapter may be unnecessary
- Cal wants us to move as much logic into the deep link manager file
- Clean up DeeplinkManager file: remove dispatch and navigation and instead import them as services (NavigationService, ReduxService)
- Remove if possible: switch network and approveTransaction

- DeeplinkManager only has send and start in it right now. It is a good start.
- Is UniversalRouterIntegration really needed?
- Remove SwapHandler and SendHadler action registry out of UniversalRouter.
- UniversalRouter analytics can be moved to DeeplinkManager. Talk with Alexey about what types of analytics we want tracked
- Double-check if we _really_ need multiple actions per handler or multiple handlers per action. Cal thinks no.
- handleUniversalLink renamed to handleLink and should handle ANY action? Does not need to be in the form of a utility function (maybe class instead?)
- So /router and /registry can maybe be removed?
- CoreLinkNormalizer: doesn't need to be class? Move some of them into utility functions?

- Files in /types folder can be put into one file OR put into the files where those types are actually used (edited)

- Don't need to change the utils directory

- parseDeeplinkk.ts into /utils folder
- handleDeeplink into /handlers directory
- Remove SharedDeeplinkManager layer and keep DeeplinkManager file. Is just a proxy for the deeplink manager. Nothing unique to it that makes it shared(?) It's a singleton because it keeps track of a DeeplinkManager instance. Possibly just add it to DeeplinkManager.ts as another export (and update variables). Named version only for testing purposes(?). (Export both class and shared instance)

- At the end figure out the best place to put the analytics event (handleDeeplink?)

- Send a message to the thread and let them know we're done with the scope of the work.
