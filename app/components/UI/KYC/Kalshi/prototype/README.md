# Kalshi prototype (do not merge)

A dev-only build of the Kalshi identity flow with a faked backend, for engineers to build the real flow on top of. Every file here starts with `PROTOTYPE-DO-NOT-MERGE` and nothing runs outside `__DEV__`.

## Run it

Developer options > **Open Kalshi prototype**. That screen lets you start a scenario, resolve a pending review, simulate failures and reset. Verification codes are always `000000`.

## Find a screen from Paper

The designs live on the [Kalshi real-screens page](https://app.paper.design/file/01M78EE7WQ41JDTCG688FYYEJ6/p-4-2). Each screen there has an ID tag above its caption (`KP-01`, `KP-02`, ...), and its layer is named after that ID.

[`prototypeScreens.ts`](./prototypeScreens.ts) maps every ID to:

- `paperNode`: the Paper node of the screen (the last part of a Paper node link)
- `file`: the file that renders it (`null` for system UI the prototype doesn't build, like push notifications)
- `reach`: the scenario and steps that show it in the prototype

So from a Paper link, search `prototypeScreens.ts` for the node ID or the `KP-` ID. Prototype screen files also name their IDs in a comment at the top.

Screens marked "Reused from VBA" on the board render the shared VBA views under `app/components/UI/KYC/Views/`; the prototype only feeds them fake data.

## Keep it in step

When a screen is added, removed or moved on the board, or a screen file changes, update `prototypeScreens.ts` and the ID tag on the board in the same change.
