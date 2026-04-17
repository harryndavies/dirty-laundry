import { Capacitor } from '@capacitor/core'

export const isNativeIOS = Capacitor.getPlatform() === 'ios'
export const isNative = Capacitor.isNativePlatform()
