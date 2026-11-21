import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { DEFAULT_PARAMS, type Params, type SupportOrg, SUPPORT_ORGS } from '@zus/engine';

export const C = { brand: '#0b7a3e', brandLight: '#e7f4ec', ink: '#17212b', muted: '#5b6875', bg: '#f6f8f7', border: '#e2e8f0', accent: '#1f5fa8' };

// Adres REST API aplikacji webowej (parametry z panelu admina). Fallback: parametry wbudowane.
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export function useRemoteConfig() {
  const [cfg, setCfg] = useState<{ params: Params; support: SupportOrg[]; online: boolean }>({ params: DEFAULT_PARAMS, support: SUPPORT_ORGS, online: false });
  useEffect(() => {
    fetch(`${API_URL}/api/params`)
      .then((r) => r.json())
      .then((c) => c?.params && setCfg({ params: c.params, support: c.support ?? SUPPORT_ORGS, online: true }))
      .catch(() => {});
  }, []);
  return cfg;
}

export const Card = ({ children, style }: { children: ReactNode; style?: object }) => <View style={[s.card, style]}>{children}</View>;
export const H = ({ children }: { children: ReactNode }) => <Text style={s.h}>{children}</Text>;
export const Muted = ({ children }: { children: ReactNode }) => <Text style={s.muted}>{children}</Text>;

export function NumField({ label, value, onChange, suffix }: { label: string; value: number; onChange: (n: number) => void; suffix?: string }) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={s.label}>{label}</Text>
      <View style={s.inputRow}>
        <TextInput style={s.input} keyboardType="numeric" value={String(value ?? 0)} onChangeText={(t) => onChange(parseFloat(t.replace(',', '.')) || 0)} />
        {suffix && <Text style={s.muted}>{suffix}</Text>}
      </View>
    </View>
  );
}

export function TextField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (s: string) => void; placeholder?: string }) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput style={[s.input, s.inputRow]} value={value} placeholder={placeholder} onChangeText={onChange} />
    </View>
  );
}

export function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (b: boolean) => void }) {
  return (
    <View style={s.toggle}>
      <Text style={{ flex: 1, color: C.ink }}>{label}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: C.brand }} />
    </View>
  );
}

export function Segmented<T extends string>({ options, value, onChange }: { options: [T, string][]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={s.seg}>
      {options.map(([v, l]) => (
        <Pressable key={v} onPress={() => onChange(v)} style={[s.segItem, value === v && s.segActive]}>
          <Text style={{ fontSize: 12, fontWeight: value === v ? '700' : '400', color: value === v ? C.brand : C.ink, textAlign: 'center' }}>{l}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export const s = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.border, marginBottom: 12 },
  h: { fontSize: 17, fontWeight: '700', color: C.ink, marginBottom: 8 },
  muted: { color: C.muted, fontSize: 13 },
  label: { color: C.muted, fontSize: 13, marginBottom: 4 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 12, backgroundColor: '#fff' },
  input: { flex: 1, paddingVertical: 10, fontSize: 16, color: C.ink },
  toggle: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  seg: { flexDirection: 'row', backgroundColor: '#eef1f4', borderRadius: 12, padding: 4, marginBottom: 10 },
  segItem: { flex: 1, paddingVertical: 8, borderRadius: 8 },
  segActive: { backgroundColor: '#fff' },
});
