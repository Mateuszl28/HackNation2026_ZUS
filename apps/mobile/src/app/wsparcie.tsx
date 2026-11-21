import { Linking, Pressable, ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { OFFICIAL_LINKS } from '@zus/engine';
import { C, Card, H, Muted, useRemoteConfig } from '@/lib/ui';

export default function Support() {
  const { support } = useRemoteConfig();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        <Text style={{ fontSize: 26, fontWeight: '800', color: C.ink, marginBottom: 12 }}>Wsparcie</Text>
        {support.map((o) => (
          <Card key={o.name}>
            <H>{o.name}</H>
            <Muted>{o.description}</Muted>
            {o.url && <Pressable onPress={() => Linking.openURL(o.url!)}><Text style={{ color: C.accent, fontWeight: '600', marginTop: 8 }}>{o.url}</Text></Pressable>}
            {o.phone && <Pressable onPress={() => Linking.openURL(`tel:${o.phone!.replace(/\s/g, '')}`)}><Text style={{ color: C.brand, fontWeight: '700', marginTop: 6 }}>☎ {o.phone}</Text></Pressable>}
          </Card>
        ))}
        <Card>
          <H>Oficjalne źródła</H>
          {OFFICIAL_LINKS.map((l) => (
            <Pressable key={l.url} onPress={() => Linking.openURL(l.url)}><Text style={{ color: C.accent, paddingVertical: 4 }}>{l.name}</Text></Pressable>
          ))}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
