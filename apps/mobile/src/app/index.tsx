import { useMemo, useState } from 'react';
import { ScrollView, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { calculate, deadlines, pln, DEMO_CASES, type CalcInput, type InsuranceTitle, type ParentInput } from '@zus/engine';
import { C, Card, H, Muted, NumField, Segmented, TextField, Toggle, useRemoteConfig } from '@/lib/ui';

const TITLES: [InsuranceTitle, string][] = [['employment', 'Etat'], ['mandate', 'Zlecenie'], ['business', 'Firma'], ['none', 'Brak']];
const COLORS: Record<string, string> = { maternity: C.brand, maternityFather: '#0284c7', adoptionMaternity: C.brand, supplementary: '#34d399', parental: '#0d9488', paternity: '#6366f1', prenatal: C.brand };

const START: CalcInput = {
  scenario: 'birth',
  eventDate: new Date(Date.now() + 120 * 86400000).toISOString().slice(0, 10),
  children: 1,
  mother: { title: 'employment', monthlyBase: 7000, largeEmployer: true },
  father: { title: 'employment', monthlyBase: 7000 },
  plan: { motherParentalWeeks: 32, fatherParentalWeeks: 9, paternity: true },
};

function Parent({ name, p, set }: { name: string; p: ParentInput; set: (p: ParentInput) => void }) {
  return (
    <View style={{ marginBottom: 6 }}>
      <Text style={{ fontWeight: '700', marginBottom: 6, color: C.ink }}>{name}</Text>
      <Segmented options={TITLES} value={p.title} onChange={(t) => set({ ...p, title: t })} />
      {p.title !== 'none' && <NumField label={p.title === 'business' ? 'Podstawa składek' : 'Wynagrodzenie brutto'} value={p.monthlyBase} suffix="zł" onChange={(n) => set({ ...p, monthlyBase: n })} />}
    </View>
  );
}

export default function Calculator() {
  const { params, online } = useRemoteConfig();
  const [input, setInput] = useState<CalcInput>(START);
  const r = useMemo(() => calculate(input, params), [input, params]);
  const set = (p: Partial<CalcInput>) => setInput((i) => ({ ...i, ...p }));
  const plan = (p: Partial<CalcInput['plan']>) => setInput((i) => ({ ...i, plan: { ...i.plan, ...p } }));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        <Text style={{ fontSize: 26, fontWeight: '800', color: C.ink }}>Przewodnik Rodzica</Text>
        <Muted>Parametry v{params.version} {online ? '· zsynchronizowane z serwerem' : '· offline'}</Muted>

        <View style={{ backgroundColor: C.brand, borderRadius: 18, padding: 18, marginVertical: 14 }}>
          <Text style={{ color: '#ffffffcc' }}>Szacowany zasiłek dla rodziny</Text>
          <Text style={{ color: '#fff', fontSize: 32, fontWeight: '800' }}>{pln(r.total)}</Text>
          <Text style={{ color: '#ffffffcc' }}>Matka {pln(r.mother.total)} · Ojciec {pln(r.father.total)}</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          {DEMO_CASES.map((c) => (
            <Pressable key={c.id} onPress={() => setInput(c.input)} style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: C.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, marginRight: 8 }}>
              <Text style={{ fontSize: 12 }}>{c.title.split(' – ')[0]}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <Card>
          <H>Sytuacja</H>
          <Segmented options={[['birth', 'Poród'], ['adoption', 'Adopcja'], ['foster', 'Rodz. zastępcza']]} value={input.scenario} onChange={(v) => set({ scenario: v })} />
          <TextField label="Data porodu / przyjęcia (RRRR-MM-DD)" value={input.eventDate} onChange={(t) => set({ eventDate: t })} />
          <NumField label="Liczba dzieci" value={input.children} onChange={(n) => set({ children: Math.max(1, Math.round(n)) })} />
          {input.scenario !== 'birth' && <NumField label="Wiek dziecka" value={input.childAgeYears ?? 0} suffix="lat" onChange={(n) => set({ childAgeYears: n })} />}
          {input.scenario === 'birth' && (
            <>
              <Toggle label="Zaświadczenie „Za życiem”" value={!!input.zaZyciem} onChange={(b) => set({ zaZyciem: b })} />
              <Toggle label="Wcześniak (28–36 tc.)" value={input.prematurity === 'premature'} onChange={(b) => set({ prematurity: b ? 'premature' : 'none', hospitalDays: b ? 21 : 0 })} />
              {input.prematurity === 'premature' && <NumField label="Dni w szpitalu" value={input.hospitalDays ?? 0} onChange={(n) => set({ hospitalDays: n })} />}
            </>
          )}
        </Card>

        <Card>
          <Parent name="Matka" p={input.mother} set={(p) => set({ mother: p })} />
          <Parent name="Ojciec" p={input.father} set={(p) => set({ father: p })} />
        </Card>

        <Card>
          <H>Plan</H>
          <NumField label="Rodzicielski – matka" value={input.plan.motherParentalWeeks ?? 0} suffix="tyg." onChange={(n) => plan({ motherParentalWeeks: n })} />
          <NumField label="Rodzicielski – ojciec" value={input.plan.fatherParentalWeeks ?? 0} suffix="tyg." onChange={(n) => plan({ fatherParentalWeeks: n })} />
          <Toggle label="Urlop ojcowski (14 dni)" value={!!input.plan.paternity} onChange={(b) => plan({ paternity: b })} />
          <Toggle label="81,5% za cały okres" value={!!input.plan.oneApplication} onChange={(b) => plan({ oneApplication: b })} />
          <Toggle label="Matka łączy rodzicielski z pracą (1/2)" value={!!input.plan.workFraction} onChange={(b) => plan({ workFraction: b ? { who: 'mother', fraction: 0.5 } : undefined })} />
        </Card>

        <Card>
          <H>Okresy</H>
          {r.periods.map((p, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderColor: C.border }}>
              <View style={{ width: 6, borderRadius: 3, backgroundColor: COLORS[p.type] }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '600', color: C.ink }}>{p.label}</Text>
                <Muted>{p.start} – {p.end} · {p.weeks} tyg. · {Math.round(p.rate * 1000) / 10}%</Muted>
              </View>
              <Text style={{ fontWeight: '700', color: C.ink }}>{pln(p.total)}</Text>
            </View>
          ))}
          {!r.periods.length && <Muted>Brak okresów, za które przysługuje zasiłek.</Muted>}
        </Card>

        {r.notices.map((n, i) => (
          <View key={i} style={{ borderRadius: 12, padding: 12, marginBottom: 8, backgroundColor: n.level === 'danger' ? '#fef2f2' : n.level === 'warning' ? '#fffbeb' : '#f0f9ff' }}>
            <Text style={{ fontWeight: '700' }}>{n.title}</Text>
            <Text style={{ fontSize: 13 }}>{n.text}</Text>
          </View>
        ))}

        <Card>
          <H>Terminy</H>
          {deadlines(input, r, params).map((d, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 10, paddingVertical: 6 }}>
              <Text style={{ fontFamily: 'monospace', fontSize: 12, color: d.critical ? '#b91c1c' : C.muted, width: 84 }}>{d.date}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '600', color: C.ink }}>{d.title}</Text>
                <Muted>{d.description}</Muted>
              </View>
            </View>
          ))}
        </Card>

        <Card>
          <H>Dokumenty</H>
          {r.documents.map((d, i) => (
            <View key={i} style={{ paddingVertical: 6 }}>
              <Text style={{ color: C.ink }}>• {d.name}</Text>
              <Muted>{d.where} · {d.when}</Muted>
            </View>
          ))}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
