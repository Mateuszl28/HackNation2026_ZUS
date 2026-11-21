import { useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { buildChecklist, calculate, pln, pregnancyProgress, PHASE_LABELS, type Phase } from '@zus/engine';
import { C, Card, H, Muted, useRemoteConfig } from '@/lib/ui';
import { usePlan } from '@/lib/plan-store';

const PHASES: Phase[] = ['now', 'beforeBirth', 'afterBirth', 'later'];

export default function Plan() {
  const { params } = useRemoteConfig();
  const { input, done, toggleDone } = usePlan();
  const today = new Date().toISOString().slice(0, 10);
  const result = useMemo(() => calculate(input, params), [input, params]);
  const items = useMemo(() => buildChecklist(input, result, today, params), [input, result, today, params]);
  const prog = pregnancyProgress(input.eventDate, today);
  const doneCount = items.filter((i) => done[i.id]).length;
  const isBirth = input.scenario === 'birth';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        <Text style={{ fontSize: 26, fontWeight: '800', color: C.ink, marginBottom: 12 }}>Mój plan</Text>

        <View style={{ backgroundColor: C.brand, borderRadius: 18, padding: 18, marginBottom: 12 }}>
          <Text style={{ color: '#ffffffcc' }}>{isBirth ? (prog.born ? 'Dziecko jest już na świecie' : `Trymestr ${prog.trimester}`) : 'Przyjęcie dziecka'}</Text>
          <Text style={{ color: '#fff', fontSize: 28, fontWeight: '800' }}>{isBirth ? (prog.born ? `${-prog.daysLeft} dni po porodzie` : `${prog.week}. tydzień ciąży`) : input.eventDate}</Text>
          {isBirth && (
            <>
              <View style={{ height: 8, borderRadius: 4, backgroundColor: '#ffffff33', marginTop: 12, overflow: 'hidden' }}>
                <View style={{ height: 8, width: `${prog.percent}%`, backgroundColor: '#b6f2cd', borderRadius: 4 }} />
              </View>
              {!prog.born && <Text style={{ color: '#ffffffcc', marginTop: 6 }}>Do porodu: {prog.daysLeft} dni ({input.eventDate})</Text>}
            </>
          )}
        </View>

        <Card>
          <Text style={{ color: C.muted }}>Postęp: {doneCount} / {items.length} · zasiłek łącznie {pln(result.total)}</Text>
          <View style={{ height: 6, borderRadius: 3, backgroundColor: '#eef1f4', marginTop: 8, overflow: 'hidden' }}>
            <View style={{ height: 6, width: `${items.length ? (doneCount / items.length) * 100 : 0}%`, backgroundColor: C.accent }} />
          </View>
        </Card>

        {PHASES.map((ph) => {
          const list = items.filter((i) => i.phase === ph);
          if (!list.length) return null;
          return (
            <Card key={ph}>
              <H>{PHASE_LABELS[ph]}</H>
              {list.map((it) => {
                const d = !!done[it.id];
                const overdue = !d && it.due && it.due < today;
                return (
                  <Pressable key={it.id} onPress={() => toggleDone(it.id)} accessibilityRole="checkbox" accessibilityState={{ checked: d }} style={{ flexDirection: 'row', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderColor: C.border }}>
                    <View style={{ width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: d ? C.brand : '#cbd5e1', backgroundColor: d ? C.brand : '#fff', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
                      {d && <Text style={{ color: '#fff', fontWeight: '900' }}>✓</Text>}
                    </View>
                    <View style={{ flex: 1, opacity: d ? 0.5 : 1 }}>
                      <Text style={{ fontWeight: '600', color: C.ink, textDecorationLine: d ? 'line-through' : 'none' }}>
                        {it.title}{it.critical && !d ? '  ❗' : ''}
                      </Text>
                      <Muted>{it.description}</Muted>
                      {it.due && <Text style={{ fontSize: 12, marginTop: 2, color: overdue ? '#b91c1c' : C.muted, fontFamily: 'monospace' }}>{it.due}</Text>}
                    </View>
                  </Pressable>
                );
              })}
            </Card>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
