import { useEffect, useState, type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { SymbolView } from 'expo-symbols';
import { DEFAULT_PARAMS, type Params, type SupportOrg, SUPPORT_ORGS } from '@zus/engine';

// ---------- design tokens ----------
export const C = {
  brand: '#0b7a3e',
  brandDark: '#065a2c',
  brandLight: '#e3f3ea',
  ink: '#111827',
  muted: '#6b7280',
  bg: '#f3f5f4',
  surface: '#ffffff',
  border: '#e6e9ec',
  accent: '#1f5fa8',
  amber: '#b45309',
  amberBg: '#fff7e6',
  red: '#b91c1c',
  redBg: '#fef2f2',
  sky: '#0c4a6e',
  skyBg: '#eef6fc',
};
export const R = { sm: 12, md: 18, lg: 24, pill: 999 };
export const shadow: ViewStyle = Platform.select({
  android: { elevation: 2 },
  default: { shadowColor: '#0f172a', shadowOpacity: 0.07, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } },
}) as ViewStyle;

// Adres REST API aplikacji webowej (parametry z panelu urzędnika). Fallback: parametry wbudowane.
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

export const tap = () => Haptics.selectionAsync().catch(() => {});

// ---------- icon ----------
export type IconName = { ios: string; android: string };
export function Icon({ name, size = 20, color = C.ink }: { name: IconName; size?: number; color?: string }) {
  return <SymbolView name={name as never} size={size} tintColor={color} />;
}
export const I = {
  calc: { ios: 'function', android: 'calculate' },
  plan: { ios: 'checklist', android: 'checklist' },
  bot: { ios: 'bubble.left.and.bubble.right', android: 'smart_toy' },
  map: { ios: 'map', android: 'map' },
  heart: { ios: 'heart.circle', android: 'volunteer_activism' },
  baby: { ios: 'figure.and.child.holdinghands', android: 'child_care' },
  warn: { ios: 'exclamationmark.triangle.fill', android: 'warning' },
  info: { ios: 'info.circle.fill', android: 'info' },
  stop: { ios: 'xmark.octagon.fill', android: 'report' },
  check: { ios: 'checkmark', android: 'check' },
  doc: { ios: 'doc.text', android: 'description' },
  calendar: { ios: 'calendar', android: 'event' },
  phone: { ios: 'phone.fill', android: 'call' },
  link: { ios: 'arrow.up.right', android: 'open_in_new' },
  send: { ios: 'arrow.up', android: 'arrow_upward' },
  minus: { ios: 'minus', android: 'remove' },
  plus: { ios: 'plus', android: 'add' },
  wifi: { ios: 'wifi', android: 'wifi' },
  wifiOff: { ios: 'wifi.slash', android: 'wifi_off' },
} satisfies Record<string, IconName>;

// ---------- layout ----------
export function Screen({ title, subtitle, children, scroll = true, right }: { title: string; subtitle?: string; children: ReactNode; scroll?: boolean; right?: ReactNode }) {
  const head = (
    <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14, flexDirection: 'row', alignItems: 'flex-end' }}>
      <View style={{ flex: 1 }}>
        <Text style={s.title}>{title}</Text>
        {subtitle ? <Text style={[s.muted, { marginTop: 2 }]}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      {scroll ? (
        <ScrollView contentContainerStyle={{ paddingBottom: Platform.OS === 'ios' ? 120 : 24 }} showsVerticalScrollIndicator={false}>
          {head}
          <View style={{ paddingHorizontal: 16 }}>{children}</View>
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>
          {head}
          {children}
        </View>
      )}
    </SafeAreaView>
  );
}

export function Hero({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return (
    <LinearGradient colors={[C.brand, C.brandDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[{ borderRadius: R.lg, padding: 20, marginBottom: 14 }, shadow, style]}>
      {children}
    </LinearGradient>
  );
}

export const Card = ({ children, style }: { children: ReactNode; style?: ViewStyle }) => <View style={[s.card, shadow, style]}>{children}</View>;
export const H = ({ children }: { children: ReactNode }) => <Text style={s.h}>{children}</Text>;
export const Muted = ({ children }: { children: ReactNode }) => <Text style={s.muted}>{children}</Text>;
export const Label = ({ children }: { children: ReactNode }) => <Text style={s.label}>{children}</Text>;

export function SectionLabel({ children }: { children: ReactNode }) {
  return <Text style={{ fontSize: 12, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', color: C.muted, marginTop: 8, marginBottom: 8, marginLeft: 4 }}>{children}</Text>;
}

// ---------- inputs ----------
export function Stepper({ label, value, onChange, step = 1, min = 0, max = 1e9, suffix, format }: { label: string; value: number; onChange: (n: number) => void; step?: number; min?: number; max?: number; suffix?: string; format?: (n: number) => string }) {
  const btn = (d: number, icon: IconName) => (
    <Pressable onPress={() => { tap(); onChange(Math.min(max, Math.max(min, Math.round((value + d) * 100) / 100))); }} style={({ pressed }) => [s.stepBtn, pressed && { opacity: 0.6 }]} accessibilityLabel={d > 0 ? `Zwiększ ${label}` : `Zmniejsz ${label}`}>
      <Icon name={icon} size={18} color={C.brand} />
    </Pressable>
  );
  return (
    <View style={s.row}>
      <Text style={[s.rowLabel, { flex: 1 }]}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {btn(-step, I.minus)}
        <Text style={{ minWidth: 72, textAlign: 'center', fontWeight: '700', fontSize: 16, color: C.ink }}>{format ? format(value) : value}{suffix ? ` ${suffix}` : ''}</Text>
        {btn(step, I.plus)}
      </View>
    </View>
  );
}

export function TextField({ label, value, onChange, placeholder, numeric }: { label: string; value: string; onChange: (s: string) => void; placeholder?: string; numeric?: boolean }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Label>{label}</Label>
      <TextInput style={s.input} value={value} placeholder={placeholder} placeholderTextColor="#9ca3af" keyboardType={numeric ? 'numeric' : 'default'} onChangeText={onChange} />
    </View>
  );
}

export function Toggle({ label, hint, value, onChange }: { label: string; hint?: string; value: boolean; onChange: (b: boolean) => void }) {
  return (
    <Pressable onPress={() => { tap(); onChange(!value); }} style={s.row} accessibilityRole="switch" accessibilityState={{ checked: value }}>
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={s.rowLabel}>{label}</Text>
        {hint ? <Text style={[s.muted, { fontSize: 12 }]}>{hint}</Text> : null}
      </View>
      <Switch value={value} onValueChange={(b) => { tap(); onChange(b); }} trackColor={{ true: C.brand, false: '#d1d5db' }} thumbColor="#fff" />
    </Pressable>
  );
}

export function Segmented<T extends string>({ options, value, onChange }: { options: [T, string][]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={s.seg}>
      {options.map(([v, l]) => {
        const on = value === v;
        return (
          <Pressable key={v} onPress={() => { tap(); onChange(v); }} style={[s.segItem, on && [s.segActive, shadow]]} accessibilityRole="button" accessibilityState={{ selected: on }}>
            <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: on ? '700' : '500', color: on ? C.brand : C.muted, textAlign: 'center' }}>{l}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Pill({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={() => { tap(); onPress(); }} style={({ pressed }) => [s.pill, active && { backgroundColor: C.brand, borderColor: C.brand }, pressed && { opacity: 0.7 }]}>
      <Text style={{ fontSize: 13, fontWeight: '600', color: active ? '#fff' : C.ink }}>{label}</Text>
    </Pressable>
  );
}

export function Notice({ level, title, text }: { level: 'info' | 'warning' | 'danger'; title: string; text: string }) {
  const map = { danger: [C.redBg, C.red, I.stop], warning: [C.amberBg, C.amber, I.warn], info: [C.skyBg, C.sky, I.info] } as const;
  const [bg, fg, icon] = map[level];
  return (
    <View style={{ flexDirection: 'row', gap: 10, backgroundColor: bg, borderRadius: R.md, padding: 14, marginBottom: 10 }}>
      <Icon name={icon} size={18} color={fg} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: '700', color: fg, marginBottom: 2 }}>{title}</Text>
        <Text style={{ fontSize: 13, color: fg, lineHeight: 18 }}>{text}</Text>
      </View>
    </View>
  );
}

export const s = StyleSheet.create({
  title: { fontSize: 30, fontWeight: '800', color: C.ink, letterSpacing: -0.5 },
  card: { backgroundColor: C.surface, borderRadius: R.lg, padding: 18, marginBottom: 14 },
  h: { fontSize: 17, fontWeight: '700', color: C.ink, marginBottom: 10 },
  muted: { color: C.muted, fontSize: 13, lineHeight: 18 },
  label: { color: C.muted, fontSize: 13, marginBottom: 6, fontWeight: '500' },
  input: { borderWidth: 1, borderColor: C.border, borderRadius: R.sm, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: C.ink, backgroundColor: '#fafbfb' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, minHeight: 52 },
  rowLabel: { fontSize: 15, color: C.ink, fontWeight: '500' },
  stepBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.brandLight, alignItems: 'center', justifyContent: 'center' },
  seg: { flexDirection: 'row', backgroundColor: '#eceff1', borderRadius: R.sm + 2, padding: 4, marginBottom: 12 },
  segItem: { flex: 1, paddingVertical: 9, borderRadius: R.sm },
  segActive: { backgroundColor: '#fff' },
  pill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: R.pill, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface, marginRight: 8 },
  divider: { height: 1, backgroundColor: C.border, marginVertical: 4 },
});
