import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal, SafeAreaView, Pressable, Image } from 'react-native';
import { components } from './previews';

const figgyIcon = require('./assets/figgy.png');

export default function App() {
  const [isDark, setIsDark] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showDebugBg, setShowDebugBg] = useState(false);

  const surface = isDark ? '#111827' : '#f3f6f8';
  const textColor = isDark ? '#ffffff' : '#191817';
  const mutedColor = isDark ? '#9ca3af' : '#6b7280';
  const divider = isDark ? '#4a5666' : '#ebeaea';
  const accent = '#2ba17f';

  const selected = selectedIndex !== null ? components[selectedIndex] : null;

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
        <Pressable style={styles.centeredView} onPress={() => setSelectedIndex(0)}>
          <Text style={[styles.centeredName, { color: mutedColor }]}>{components[0].name}</Text>
          <View style={[styles.centeredComponent, showDebugBg && { backgroundColor: 'rgba(255,0,0,0.15)' }]}>
            {React.createElement(components[0].Component, { width: '100%' })}
          </View>
        </Pressable>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {components.map(({ name, Component }, index) => (
            <Pressable key={name} style={styles.centeredView} onPress={() => setSelectedIndex(index)}>
              <Text style={[styles.centeredName, { color: mutedColor }]}>{name}</Text>
              <View style={[styles.centeredComponent, showDebugBg && { backgroundColor: 'rgba(255,0,0,0.15)' }]}>
                <Component width="100%" />
              </View>
            </Pressable>
          ))}
        </ScrollView>
      )}

      <View style={[styles.footer, { borderTopColor: divider }]}>
        <TouchableOpacity onPress={() => setShowDebugBg(!showDebugBg)} style={[styles.track, { backgroundColor: showDebugBg ? accent : (isDark ? '#374151' : '#d3d1d1') }]}>
          <View style={[styles.knob, { backgroundColor: '#fff', transform: [{ translateX: showDebugBg ? 20 : 0 }] }]} />
        </TouchableOpacity>
        <Text style={[styles.footerLabel, { color: mutedColor }]}>Show troubleshooting background</Text>
      </View>

      <Modal visible={selected !== null} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modalRoot, { backgroundColor: surface }]}>
          <View style={[styles.modalHeader, { borderBottomColor: divider }]}>
            <Text style={[styles.modalTitle, { color: textColor }]} numberOfLines={1}>
              {selected?.name}
            </Text>
            <TouchableOpacity onPress={() => setSelectedIndex(null)}>
              <Text style={{ color: accent, fontSize: 16, fontWeight: '600' }}>Done</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.modalContent}>
            {selected && <selected.Component width="100%" />}
          </View>
        </SafeAreaView>
      </Modal>
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
  modalRoot: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1 },
  modalTitle: { fontSize: 15, fontWeight: '600', flex: 1, marginRight: 16 },
  modalContent: { flex: 1, justifyContent: 'center', padding: 20 },
});
