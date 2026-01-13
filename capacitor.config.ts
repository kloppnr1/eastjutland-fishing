import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'dk.ostjylland.lystfiskerguide',
  appName: 'Østjylland Lystfisker',
  webDir: 'client/dist-static',
  server: {
    // For development - allows hot reload
    // url: 'http://localhost:5000',
    // cleartext: true
  },
  ios: {
    contentInset: 'never',
    backgroundColor: '#f9fafb',
    preferredContentMode: 'mobile'
  }
};

export default config;
