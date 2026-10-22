import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.usmanclothrehra.pos',
  appName: 'Usman Cloth POS',
  webDir: 'dist',
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined,
    },
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
    },
  },
  server: {
    androidScheme: 'https',
  },
};

export default config;
