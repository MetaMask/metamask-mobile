## iOS release

1 - Make sure you have fastlane installed (`sudo gem install fastlane`)
2 - Bump the version number in `info.plist` and commit the change
2 - Run `npm run release:ios`
3 - Wait for the appstore email that the build has completed processing (10 min - 1 hour)
4 - Go to this url: https://appstoreconnect.apple.com/WebObjects/iTunesConnect.woa/ra/ng/app/1438144202/testflight?section=iosbuilds
5 - Click on the version number and then click on the "Test Details" tab
7 - Enter the release notes and save
8 - Click on the "Testers" tabs
9 - Click on the `+` sign next to Groups and select Alpha.


## Android release

1 - open android/app//build.gradle and change the version number
2 - Save and commit
3 - Run `npm run release:android`
4 - Go to the playstore: https://play.google.com/apps/publish/?account=9089866037123936197
6 - Click on the App logo, then go to Release Management >> App releases
7 - Go to "Manage" inside "Closed track" (ALPHA)
8 - Click Create Release
9 - Drag the APK
10 - Add Release notes at the bottom
11 - Click review
12 - Start rollout to ALPHA
