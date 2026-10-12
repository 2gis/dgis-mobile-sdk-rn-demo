import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { MapView } from '@2gis/dgis-mobile-sdk-full';
import { useSdk } from '../sdk/useSdk';
import { useDefaultMapOptions } from '../hooks/useDefaultMapOptions';
import { useMapController } from '../hooks/useMapController';

/**
 * Bouncing map animated through three phases — demonstrates TextureView
 * rendering mode that supports view transforms (resize, repositioning).
 *
 * Mirrors the native Android TextureViewActivity / JumpLayout.
 */
export function TextureViewDemo() {
  const context = useSdk();
  const options = useDefaultMapOptions(context);
  const { controllerState, mapController } = useMapController(context, options);

  const phase = useRef(0);
  const top = useRef(new Animated.Value(0)).current;
  const width = useRef(new Animated.Value(0)).current;
  const height = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!mapController) {
      return;
    }

    let cancelled = false;

    function state1() {
      if (cancelled) return;
      phase.current = 1;
      top.setValue(0);
      width.setValue(0.33);
      height.setValue(0.33);
      Animated.parallel([
        Animated.timing(top, {
          toValue: 0.66,
          duration: 3000,
          easing: Easing.in(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(width, {
          toValue: 0.66,
          duration: 3000,
          easing: Easing.in(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(height, {
          toValue: 0.36,
          duration: 3000,
          easing: Easing.in(Easing.quad),
          useNativeDriver: false,
        }),
      ]).start(() => {
        if (!cancelled) state2();
      });
    }

    function state2() {
      if (cancelled) return;
      phase.current = 2;
      Animated.parallel([
        Animated.timing(top, {
          toValue: 1,
          duration: 500,
          easing: Easing.in(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(width, {
          toValue: 1,
          duration: 300,
          easing: Easing.in(Easing.quad),
          useNativeDriver: false,
        }),
      ]).start(() => {
        if (!cancelled) state3();
      });
    }

    function state3() {
      if (cancelled) return;
      phase.current = 3;
      Animated.parallel([
        Animated.timing(top, {
          toValue: 0,
          duration: 3000,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(width, {
          toValue: 0.33,
          duration: 3000,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(height, {
          toValue: 0.33,
          duration: 3000,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }),
      ]).start(() => {
        if (!cancelled) state1();
      });
    }

    state1();

    return () => {
      cancelled = true;
      top.stopAnimation();
      width.stopAnimation();
      height.stopAnimation();
    };
  }, [mapController, top, width, height]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.mapWrap,
          {
            top: top.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '67%'],
            }),
            width: width.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '100%'],
            }),
            height: height.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '100%'],
            }),
          },
        ]}
      >
        <MapView
          controllerState={controllerState}
          renderMode="texture"
          style={styles.map}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  mapWrap: { overflow: 'hidden', alignSelf: 'center' },
  map: { flex: 1 },
});
