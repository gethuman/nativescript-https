import { NativeScriptConfig } from '@nativescript/core'

export default {
  id: 'org.nativescript.plugindemo.https',
  appResourcesPath: 'app/App_Resources',
  android: {
    v8Flags: '--expose_gc',
    markingMode: 'none',
    requireModules: {
      0: 'nativescript-https',
    },
  },
  appPath: 'app',
} as NativeScriptConfig
