import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.inis.hashnapse',
  appName: '해시냅스',
  webDir: 'dist',
  plugins: {
    AdMob: {
      initializeOnJS: false,
      androidAppId: 'ca-app-pub-3940256099942544~3347511713',
      iosAppId: 'ca-app-pub-3940256099942544~1458002511'
    }
  }
};

export default config;
