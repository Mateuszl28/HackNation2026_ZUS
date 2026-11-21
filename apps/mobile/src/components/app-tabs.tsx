import { NativeTabs } from 'expo-router/native-tabs';

const TABS = [
  { name: 'index', label: 'Kalkulator', sf: 'function', md: 'calculate' },
  { name: 'plan', label: 'Plan', sf: 'checklist', md: 'checklist' },
  { name: 'asystent', label: 'Asystent', sf: 'bubble.left.and.bubble.right', md: 'smart_toy' },
  { name: 'przewodnik', label: 'Przewodnik', sf: 'map', md: 'map' },
  { name: 'wsparcie', label: 'Wsparcie', sf: 'heart.circle', md: 'volunteer_activism' },
] as const;

export default function AppTabs() {
  return (
    <NativeTabs
      backgroundColor="#ffffff"
      indicatorColor="#e3f3ea"
      iconColor={{ default: '#6b7280', selected: '#0b7a3e' }}
      labelStyle={{ default: { color: '#6b7280', fontSize: 11 }, selected: { color: '#0b7a3e', fontSize: 11, fontWeight: '700' } }}
      labelVisibilityMode="labeled">
      {TABS.map((t) => (
        <NativeTabs.Trigger key={t.name} name={t.name}>
          <NativeTabs.Trigger.Label>{t.label}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={t.sf} md={t.md} />
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
