import { Linking, Pressable, Text, View } from 'react-native';
import { OFFICIAL_LINKS } from '@zus/engine';
import { C, Card, I, Icon, Muted, R, Screen, SectionLabel, tap, useRemoteConfig } from '@/lib/ui';

export default function Support() {
  const { support } = useRemoteConfig();
  return (
    <Screen title="Wsparcie" subtitle="Pomoc w trudnych sytuacjach">
      <Card style={{ backgroundColor: C.skyBg }}>
        <Text style={{ color: C.sky, lineHeight: 20 }}>Po stracie dziecka przysługuje zasiłek macierzyński za co najmniej 8 tygodni oraz zasiłek pogrzebowy. Nie musisz niczego załatwiać od razu.</Text>
      </Card>

      <SectionLabel>Organizacje</SectionLabel>
      {support.map((o) => (
        <Card key={o.name}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: C.brandLight, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={I.heart} size={22} color={C.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: C.ink }}>{o.name}</Text>
              <Muted>{o.description}</Muted>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            {o.url && (
              <Pressable onPress={() => { tap(); Linking.openURL(o.url!); }} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: R.pill, backgroundColor: C.bg, opacity: pressed ? 0.6 : 1 })}>
                <Icon name={I.link} size={14} color={C.accent} />
                <Text style={{ color: C.accent, fontWeight: '600' }}>Strona</Text>
              </Pressable>
            )}
            {o.phone && (
              <Pressable onPress={() => { tap(); Linking.openURL(`tel:${o.phone!.replace(/\s/g, '')}`); }} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: R.pill, backgroundColor: C.brand, opacity: pressed ? 0.7 : 1 })}>
                <Icon name={I.phone} size={14} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: '700' }}>{o.phone}</Text>
              </Pressable>
            )}
          </View>
        </Card>
      ))}

      <SectionLabel>Oficjalne źródła</SectionLabel>
      <Card style={{ paddingVertical: 6 }}>
        {OFFICIAL_LINKS.map((l, i) => (
          <Pressable key={l.url} onPress={() => { tap(); Linking.openURL(l.url); }} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: i < OFFICIAL_LINKS.length - 1 ? 1 : 0, borderColor: C.border, opacity: pressed ? 0.6 : 1 })}>
            <Text style={{ flex: 1, color: C.ink, fontWeight: '500' }}>{l.name}</Text>
            <Icon name={I.link} size={16} color={C.muted} />
          </Pressable>
        ))}
      </Card>
    </Screen>
  );
}
