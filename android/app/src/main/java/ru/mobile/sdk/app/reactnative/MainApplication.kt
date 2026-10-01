package ru.mobile.sdk.app.reactnative

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import ru.dgis.sdk.platform.LogLevel
import ru.dgis.sdk.platform.LogOptions
import ru.dgis.sdk.reactnative.DgisMobileSdkModule
import ru.dgis.sdk.reactnative.GraphicsApi

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          // Packages that cannot be autolinked yet can be added manually here, for example:
          // add(MyReactNativePackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    loadReactNative(this)
    DgisMobileSdkModule.init(
      application = this,
      graphicsApi = GraphicsApi.OPEN_GL,
      vulkanEmulatorSupportEnabled = true,
      logOptions = LogOptions(LogLevel.INFO, LogLevel.INFO, null),
    )
  }
}
