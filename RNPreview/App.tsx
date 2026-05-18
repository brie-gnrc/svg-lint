import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { components } from './previews';

const figgyIcon = require('./assets/figgy.png');

export default function App() {
  const [isDark, setIsDark] = useState(true);
  const [showDebugBg, setShowDebugBg] = useState(false);

  const surface = isDark ? '#111827' : '#f3f6f8';
  const textColor = isDark ? '#ffffff' : '#191817';
  const mutedColor = isDark ? '#9ca3af' : '#6b7280';
  const divider = isDark ? '#4a5666' : '#ebeaea';
  const accent = '#2ba17f';

  return (
    <View style={[styles.root, { backgroundColor: surface }]}>
      <View style={[styles.header, { borderBottomColor: divider }]}>
        <View style={styles.headerRow}>
          <Image source={figgyIcon} style={styles.figgyIcon} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: textColor }]}>Figgity</Text>
            <Text style={[styles.subtitle, { color: mutedColor }]}>Figgy validates your SVGs for React Native, no doubt</Text>
          </View>
          <View style={styles.toggleRow}>
            <Text style={{ fontSize: 14 }}>🌙</Text>
            <TouchableOpacity onPress={() => setIsDark(!isDark)} style={[styles.track, { backgroundColor: isDark ? '#374151' : '#d3d1d1' }]}>
              <View style={[styles.knob, { backgroundColor: accent, transform: [{ translateX: isDark ? 0 : 20 }] }]} />
            </TouchableOpacity>
            <Text style={{ fontSize: 14 }}>☀️</Text>
          </View>
        </View>
      </View>

      {components.length === 0 ? (
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: mutedColor }]}>No components loaded</Text>
          <Text style={[styles.emptyHint, { color: mutedColor }]}>
            Use the Figgity GUI to push components here
          </Text>
        </View>
      ) : components.length === 1 ? (
        <View style={styles.centeredView}>
          <Text style={[styles.centeredName, { color: mutedColor }]}>{components[0].name}</Text>
          <View style={[styles.centeredComponent, showDebugBg && { backgroundColor: 'rgba(255,0,0,0.15)' }]}>
            {React.createElement(components[0].Component, { width: '100%', isDark })}
          </View>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {components.map(({ name, Component }, index) => (
            <View key={name} style={styles.centeredView}>
              <Text style={[styles.centeredName, { color: mutedColor }]}>{name}</Text>
              <View style={[styles.centeredComponent, showDebugBg && { backgroundColor: 'rgba(255,0,0,0.15)' }]}>
                <Component width="100%" isDark={isDark} />
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      <View style={[styles.footer, { borderTopColor: divider }]}>
        <TouchableOpacity onPress={() => setShowDebugBg(!showDebugBg)} style={[styles.track, { backgroundColor: showDebugBg ? accent : (isDark ? '#374151' : '#d3d1d1') }]}>
          <View style={[styles.knob, { backgroundColor: '#fff', transform: [{ translateX: showDebugBg ? 20 : 0 }] }]} />
        </TouchableOpacity>
        <Text style={[styles.footerLabel, { color: mutedColor }]}>Show troubleshooting background</Text>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingTop: 60 },
  header: { paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  figgyIcon: { width: 36, height: 36 },
  title: { fontSize: 17, fontWeight: '600' },
  subtitle: { fontSize: 12, marginTop: 2 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  track: { width: 42, height: 22, borderRadius: 11, justifyContent: 'center', paddingHorizontal: 2 },
  knob: { width: 18, height: 18, borderRadius: 9 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 15 },
  emptyHint: { fontSize: 12, marginTop: 6 },
  centeredView: { flex: 1, alignItems: 'center', padding: 20 },
  centeredName: { fontSize: 11, marginBottom: 12 },
  centeredComponent: { width: '100%' },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 10, borderTopWidth: 1 },
  footerLabel: { fontSize: 11 },
  scrollContent: { flexGrow: 1 },
});
