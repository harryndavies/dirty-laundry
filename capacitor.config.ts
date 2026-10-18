import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'club.dirtylaundry.app',
  appName: 'Dirty Laundry',
  webDir: 'dist',
  backgroundColor: '#FFFFFF',
  ios: {
    preferredContentMode: 'mobile',
    contentInset: 'never',
    backgroundColor: '#FFFFFF',
  },
}

export default config
