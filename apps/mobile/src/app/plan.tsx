import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { buildChecklist, calculate, pln, pregnancyProgress, PHASE_LABELS, type Phase } from '@zus/engine';
import { C, Card, Hero, I, Icon, Muted, R, Screen, SectionLabel, tap, useRemoteConfig } from '@/lib/ui';
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
    <Screen title="Mój plan" subtitle={`${doneCount} z ${items.length} kroków zrobione`}>
      <Hero>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: '#ffffff26', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={I.baby} size={26} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#ffffffcc', fontSize: 13, fontWeight: '600' }}>{isBirth ? (prog.born ? 'Dziecko jest już na świecie' : `Trymestr ${prog.trimester}`) : 'Przyjęcie dziecka'}</Text>
            <Text style={{ color: '#fff', fontSize: 26, fontWeight: '800' }}>{isBirth ? (prog.born ? `${-prog.daysLeft} dni po porodzie` : `${prog.week}. tydzień ciąży`) : input.eventDate}</Text>
          </View>
        </View>
        {isBirth && (
          <>
            <View style={{ height: 10, borderRadius: 5, backgroundColor: '#ffffff33', marginTop: 16, overflow: 'hidden' }}>
              <View style={{ height: 10, width: `${prog.percent}%`, backgroundColor: '#b6f2cd', borderRadius: 5 }} />
            </View>
            {!prog.born && <Text style={{ color: '#ffffffcc', marginTop: 8, fontSize: 13 }}>Do porodu: {prog.daysLeft} dni · {input.eventDate}</Text>}
          </>
        )}
      </Hero>

      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View style={{ flex: 1 }}>
          <Muted>Postęp</Muted>
          <View style={{ height: 8, borderRadius: 4, backgroundColor: '#eef1f4', marginTop: 8, overflow: 'hidden' }}>
            <View style={{ height: 8, width: `${items.length ? (doneCount / items.length) * 100 : 0}%`, backgroundColor: C.accent, borderRadius: 4 }} />
          </View>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Muted>Zasiłek łącznie</Muted>
          <Text style={{ fontWeight: '800', fontSize: 16, color: C.ink }}>{pln(result.total)}</Text>
        </View>
      </Card>

      {PHASES.map((ph) => {
        const list = items.filter((i) => i.phase === ph);
        if (!list.length) return null;
        return (
          <View key={ph}>
            <SectionLabel>{PHASE_LABELS[ph]} · {list.filter((i) => done[i.id]).length}/{list.length}</SectionLabel>
            <Card style={{ paddingVertical: 6 }}>
              {list.map((it, idx) => {
                const d = !!done[it.id];
                const overdue = !d && it.due && it.due < today;
                return (
                  <Pressable key={it.id} onPress={() => { tap(); toggleDone(it.id); }} accessibilityRole="checkbox" accessibilityState={{ checked: d }} style={({ pressed }) => [{ flexDirection: 'row', gap: 12, paddingVertical: 12, borderBottomWidth: idx < list.length - 1 ? 1 : 0, borderColor: C.border }, pressed && { opacity: 0.6 }]}>
                    <View style={{ width: 26, height: 26, borderRadius: 9, borderWidth: 2, borderColor: d ? C.brand : '#cbd5e1', backgroundColor: d ? C.brand : '#fff', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                      {d && <Icon name={I.check} size={16} color="#fff" />}
                    </View>
                    <View style={{ flex: 1, opacity: d ? 0.45 : 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Text style={{ fontWeight: '600', color: C.ink, textDecorationLine: d ? 'line-through' : 'none' }}>{it.title}</Text>
                        {it.critical && !d && <Text style={{ fontSize: 10, fontWeight: '800', color: C.red, backgroundColor: C.redBg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: R.pill, overflow: 'hidden' }}>WAŻNE</Text>}
                      </View>
                      <Muted>{it.description}</Muted>
                      {it.due && <Text style={{ fontSize: 12, marginTop: 4, color: overdue ? C.red : C.muted, fontWeight: '600' }}>{overdue ? 'Po terminie · ' : 'Termin · '}{it.due}</Text>}
                    </View>
                  </Pressable>
                );
              })}
            </Card>
          </View>
        );
      })}
    </Screen>
  );
}
