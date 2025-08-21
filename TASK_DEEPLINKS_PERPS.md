Your task is complete https://consensyssoftware.atlassian.net/browse/TAT-1344 and integrate deeplinks for the perps environment.

We want to create 2 deeplinks (#1 is highest priority)

A deeplink to the perp market details (which would display the perps tutorial for first time users)

A deeplink to each perp asset screen (ex: BTC perp, ETH perp etc.)

Acceptance criteria for #1:

If a user is on MOBILE…

And MM Mobile App is installed (with a release that has Perps experience) :

And if a user hasn't seen the Perps education screens, then it takes that first time perps users into that flow.

And if a user has already seen the education screens, then it takes a user to the Perpetuals tab (where they can then choose the next step of funding/trading/withdrawing).

And MM Mobile App is installed (but on a release that pre-dates Perps): Show users interstitial with messaging that encourages them to update their mobile app to get access to Perps.

And MM Mobile App is not installed: it’ll take users to the App Store if they are on iOS or the Google Play Store if they are on Android.

If a user is on DESKTOP…

And MM Ext is installed: It should take users to the metamask.io/perps page (this will be built by marketing and tout the value props and how to get it... by downloading mobile)

And MM Ext is not installed: it’ll take a user to Download MetaMask: The Premier Crypto Wallet App and Browser Extension page

Ensure the link provided could work on various marketing channels, ranging from in-product notifications (carousel, in-app notifications, push, full screen modals) to other marketing channels (email, twitter, web, paid ads, etc).

Acceptance criteria for #2:

Open the perp asset detail page of the perp asset that is mentioned in the notification

Connect the user wallet account that is relevant (ie. the one that relates to the notification)

You must refer to docs/readme/deeplinks.md
