import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'club.dirtylaundry.app',
  appName: 'Dirty Laundry',
  webDir: 'dist',
  ios: {
    preferredContentMode: 'mobile',
    contentInset: 'always',
  },
};

export default config;
