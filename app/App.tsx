import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SdkProvider } from './src/sdk/SdkProvider';
import { Navigator } from './src/navigation/Navigator';

function App() {
  return (
    <SafeAreaProvider>
      <SdkProvider>
        <Navigator />
      </SdkProvider>
    </SafeAreaProvider>
  );
}

export default App;
