# 2GIS Mobile SDK — React Native demo

Demo app for [`@2gis/dgis-mobile-sdk-map`](https://www.npmjs.com/package/@2gis/dgis-mobile-sdk-map),
the map flavor of the 2GIS Mobile SDK for React Native.

- React Native 0.85 (New Architecture), React 19
- Android minSdk 24, iOS 16.0
- SDK docs: https://docs.2gis.com/react-native/sdk/overview

## Requirements

- Node.js >= 22.11
- Android Studio with an Android SDK and NDK, JDK 17+
- Xcode with CocoaPods (iOS)
- A 2GIS SDK key file `dgissdk.key`

## SDK key

The SDK reads `dgissdk.key` from the app bundle. The key is bound to an
application identifier, and this repository does not contain one
(`dgissdk.key` is git-ignored).

1. Get a key from 2GIS for your application id.
2. Set your id:
   - Android: `applicationId` in `android/app/build.gradle`
   - iOS: `PRODUCT_BUNDLE_IDENTIFIER` of the `DgisSdkDemo` target
     (`ios/DgisSdkDemo.xcodeproj`)
3. Put the key file at:
   - `android/app/src/main/assets/dgissdk.key`
   - `ios/DgisSdkDemo/dgissdk.key` (already listed in the target's Copy Bundle Resources)

If the id and the key do not match, SDK initialization fails with a
"key does not match the application" error.

## Run

```sh
npm install

# iOS
cd ios && pod install && cd ..
npm run ios

# Android
npm run android
```

The native SDK for Android is downloaded from the public 2GIS Maven
repository (`https://artifactory.2gis.dev/sdk-maven-release`, configured in
`android/build.gradle`). On iOS it is shipped inside the npm package.

Demo assets (marker images, 3D model) live in `app/src/assets/map` and are
bundled on both platforms: Android adds the folder as an assets source dir,
iOS references it as the `map` folder resource.

## Checks

```sh
npm run typecheck
npm run lint
```

## Scope

This app uses only the map flavor. Features of the full flavor
(`@2gis/dgis-mobile-sdk-full`: navigation, offline territories and
offline/hybrid data sources, smart search, copying bundled assets to files
for custom styles) are not part of it.
