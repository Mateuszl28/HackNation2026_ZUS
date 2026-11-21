import { useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { calculate, calculatePregnancyBenefits, deadlines, pln, DEMO_CASES, JOB_LOSS_LABELS, type CalcInput, type InsuranceTitle, type JobLossReason, type ParentInput } from '@zus/engine';
import { C, Card, H, Hero, I, Icon, Muted, Notice, Pill, R, Screen, SectionLabel, Segmented, Stepper, TextField, Toggle, s, useRemoteConfig } from '@/lib/ui';
import { usePlan } from '@/lib/plan-store';

const TITLES: [InsuranceTitle, string][] = [['employment', 'Etat'], ['mandate', 'Zlecenie'], ['business', 'Firma'], ['none', 'Brak']];
const COLORS: Record<string, string> = { maternity: C.brand, maternityFather: '#0284c7', adoptionMaternity: C.brand, supplementary: '#34d399', parental: '#0d9488', paternity: '#6366f1', prenatal: C.brand };
const plnShort = (n: number) => `${Math.round(n).toLocaleString('pl-PL')} zł`;

function Parent({ name, p, set }: { name: string; p: ParentInput; set: (p: ParentInput) => void }) {
  return (
    <View>
      <Text style={{ fontWeight: '700', fontSize: 15, marginBottom: 8, color: C.ink }}>{name}</Text>
      <Segmented options={TITLES} value={p.title} onChange={(t) => set({ ...p, title: t })} />
      {p.title !== 'none' && <Stepper label={p.title === 'business' ? 'Podstawa składek' : 'Brutto / mies.'} value={p.monthlyBase} step={250} min={0} format={plnShort} onChange={(n) => set({ ...p, monthlyBase: n })} />}
    </View>
  );
}

export default function Calculator() {
  const { params, online } = useRemoteConfig();
  const { input, setInput } = usePlan();
  const [preg, setPreg] = useState({ sickOn: false, sickFrom: new Date().toISOString().slice(0, 10), sickDays: 60, lossOn: false, lossDate: new Date().toISOString().slice(0, 10), reason: 'liquidation' as JobLossReason });
  const pr = useMemo(() => calculatePregnancyBenefits({ parent: input.mother, dueDate: input.eventDate, sickFrom: preg.sickOn ? preg.sickFrom : undefined, sickDays: preg.sickOn ? preg.sickDays : 0, jobLoss: preg.lossOn ? { date: preg.lossDate, reason: preg.reason } : undefined }, params), [input, preg, params]);
  const r = useMemo(() => calculate(input, params), [input, params]);
  const set = (p: Partial<CalcInput>) => setInput((i) => ({ ...i, ...p }));
  const plan = (p: Partial<CalcInput['plan']>) => setInput((i) => ({ ...i, plan: { ...i.plan, ...p } }));
  const weeks = Math.round(r.periods.reduce((a, p) => a + p.days, 0) / 7);
  const caseId = DEMO_CASES.find((c) => JSON.stringify(c.input) === JSON.stringify(input))?.id;

  return (
    <Screen
      title="Przewodnik Rodzica"
      subtitle={`Parametry v${params.version}`}
      right={
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: online ? C.brandLight : '#eceff1', paddingHorizontal: 10, paddingVertical: 5, borderRadius: R.pill }}>
          <Icon name={online ? I.wifi : I.wifiOff} size={14} color={online ? C.brand : C.muted} />
          <Text style={{ fontSize: 12, fontWeight: '600', color: online ? C.brand : C.muted }}>{online ? 'online' : 'offline'}</Text>
        </View>
      }>
      <Hero>
        <Text style={{ color: '#ffffffcc', fontSize: 13, fontWeight: '600' }}>Szacowany zasiłek dla rodziny</Text>
        <Text style={{ color: '#fff', fontSize: 38, fontWeight: '800', letterSpacing: -1, marginTop: 2 }}>{pln(r.total)}</Text>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
          {[['Mama', r.mother.total], ['Tata', r.father.total], ['Tygodni', weeks]].map(([l, v]) => (
            <View key={l as string} style={{ flex: 1, backgroundColor: '#ffffff22', borderRadius: R.sm, padding: 10 }}>
              <Text style={{ color: '#ffffffb3', fontSize: 11, fontWeight: '600' }}>{l}</Text>
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>{typeof v === 'number' && l !== 'Tygodni' ? plnShort(v) : v}</Text>
            </View>
          ))}
        </View>
      </Hero>

      <SectionLabel>Szybki wybór sytuacji</SectionLabel>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6, marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16 }}>
        {DEMO_CASES.map((c) => <Pill key={c.id} label={c.title.split(' – ')[0]} active={caseId === c.id} onPress={() => setInput(c.input)} />)}
      </ScrollView>

      <SectionLabel>Sytuacja</SectionLabel>
      <Card>
        <Segmented options={[['birth', 'Poród'], ['adoption', 'Adopcja'], ['foster', 'Rodz. zastępcza']]} value={input.scenario} onChange={(v) => set({ scenario: v })} />
        <TextField label="Data porodu / przyjęcia (RRRR-MM-DD)" value={input.eventDate} onChange={(t) => set({ eventDate: t })} />
        <Stepper label="Liczba dzieci" value={input.children} min={1} max={8} onChange={(n) => set({ children: n })} />
        {input.scenario !== 'birth' && <Stepper label="Wiek dziecka" value={input.childAgeYears ?? 0} min={0} max={14} suffix="lat" onChange={(n) => set({ childAgeYears: n })} />}
        {input.scenario === 'birth' && (
          <>
            <View style={s.divider} />
            <Toggle label="Zaświadczenie „Za życiem”" hint="Rodzicielski 65/67 tyg." value={!!input.zaZyciem} onChange={(b) => set({ zaZyciem: b })} />
            <Toggle label="Wcześniak (28–36 tc.)" hint="Uzupełniający urlop macierzyński" value={input.prematurity === 'premature'} onChange={(b) => set({ prematurity: b ? 'premature' : 'none', hospitalDays: b ? 21 : 0 })} />
            {input.prematurity === 'premature' && <Stepper label="Dni w szpitalu" value={input.hospitalDays ?? 0} step={7} min={0} max={120} onChange={(n) => set({ hospitalDays: n })} />}
          </>
        )}
      </Card>

      <SectionLabel>Rodzice</SectionLabel>
      <Card>
        <Parent name="Mama" p={input.mother} set={(p) => set({ mother: p })} />
        <View style={[s.divider, { marginVertical: 12 }]} />
        <Parent name="Tata" p={input.father} set={(p) => set({ father: p })} />
      </Card>

      <SectionLabel>Plan urlopów</SectionLabel>
      <Card>
        <Stepper label="Rodzicielski – mama" value={input.plan.motherParentalWeeks ?? 0} min={0} max={r.limits.parentalWeeks} suffix="tyg." onChange={(n) => plan({ motherParentalWeeks: n })} />
        <Stepper label="Rodzicielski – tata" value={input.plan.fatherParentalWeeks ?? 0} min={0} max={r.limits.parentalWeeks} suffix="tyg." onChange={(n) => plan({ fatherParentalWeeks: n })} />
        <View style={s.divider} />
        <Toggle label="Urlop ojcowski" hint="14 dni, 100%" value={!!input.plan.paternity} onChange={(b) => plan({ paternity: b })} />
        <Toggle label="81,5% za cały okres" hint="Wniosek do 21 dni po porodzie" value={!!input.plan.oneApplication} onChange={(b) => plan({ oneApplication: b })} />
        <Toggle label="Mama łączy rodzicielski z pracą" hint="1/2 etatu – urlop 2× dłuższy" value={!!input.plan.workFraction} onChange={(b) => plan({ workFraction: b ? { who: 'mother', fraction: 0.5 } : undefined })} />
      </Card>

      <SectionLabel>Okresy i kwoty</SectionLabel>
      <Card>
        {r.periods.map((p, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 12, paddingVertical: 10, borderBottomWidth: i < r.periods.length - 1 ? 1 : 0, borderColor: C.border, alignItems: 'center' }}>
            <View style={{ width: 6, alignSelf: 'stretch', borderRadius: 3, backgroundColor: COLORS[p.type] }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '600', color: C.ink }}>{p.label}</Text>
              <Muted>{p.start} – {p.end} · {p.weeks} tyg. · {Math.round(p.rate * 1000) / 10}%</Muted>
            </View>
            <Text style={{ fontWeight: '700', color: C.ink }}>{plnShort(p.total)}</Text>
          </View>
        ))}
        {!r.periods.length && <Muted>Brak okresów, za które przysługuje zasiłek.</Muted>}
      </Card>

      {r.notices.map((n, i) => <Notice key={i} level={n.level} title={n.title} text={n.text} />)}

      {input.scenario === 'birth' && (
        <>
          <SectionLabel>W ciąży (do porodu)</SectionLabel>
          <Card>
            <Toggle label="Zwolnienie lekarskie (kod B)" hint="100% podstawy, potem świadczenie rehabilitacyjne" value={preg.sickOn} onChange={(b) => setPreg({ ...preg, sickOn: b })} />
            {preg.sickOn && (
              <>
                <TextField label="Początek L4 (RRRR-MM-DD)" value={preg.sickFrom} onChange={(t) => setPreg({ ...preg, sickFrom: t })} />
                <Stepper label="Dni L4" value={preg.sickDays} step={10} min={0} max={500} onChange={(n) => setPreg({ ...preg, sickDays: n })} />
              </>
            )}
            <Toggle label="Utrata pracy w ciąży" hint="Likwidacja, upadłość pracodawcy" value={preg.lossOn} onChange={(b) => setPreg({ ...preg, lossOn: b })} />
            {preg.lossOn && (
              <>
                <TextField label="Ostatni dzień pracy (RRRR-MM-DD)" value={preg.lossDate} onChange={(t) => setPreg({ ...preg, lossDate: t })} />
                <Segmented options={[['liquidation', 'Likwidacja'], ['bankruptcy', 'Upadłość'], ['other', 'Inna']]} value={preg.reason === 'liquidation' || preg.reason === 'bankruptcy' ? preg.reason : 'other'} onChange={(v) => setPreg({ ...preg, reason: v as JobLossReason })} />
                <Muted>{JOB_LOSS_LABELS[preg.reason]}</Muted>
              </>
            )}
            {pr.segments.map((x, i) => (
              <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderColor: C.border, marginTop: i === 0 ? 8 : 0 }}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={{ fontWeight: '600', color: C.ink }}>{x.label}</Text>
                  <Muted>{x.from} – {x.to} · {x.days} dni · {x.payer}</Muted>
                </View>
                <Text style={{ fontWeight: '700', color: C.ink }}>{plnShort(x.amount)}</Text>
              </View>
            ))}
            {(preg.sickOn || preg.lossOn) && <Text style={{ marginTop: 8, fontWeight: '800', color: C.brand, fontSize: 16 }}>Razem do porodu: {pln(pr.total)}</Text>}
          </Card>
          {pr.notices.filter((n) => n.level !== 'info').map((n, i) => <Notice key={i} level={n.level} title={n.title} text={n.text} />)}
        </>
      )}

      <SectionLabel>Terminy</SectionLabel>
      <Card>
        {deadlines(input, r, params).map((d, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 12, paddingVertical: 8, alignItems: 'flex-start' }}>
            <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: d.critical ? C.redBg : C.brandLight, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={I.calendar} size={18} color={d.critical ? C.red : C.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '600', color: C.ink }}>{d.title}</Text>
              <Text style={{ fontSize: 12, color: d.critical ? C.red : C.muted, fontWeight: '600' }}>{d.date}</Text>
              <Muted>{d.description}</Muted>
            </View>
          </View>
        ))}
      </Card>

      <SectionLabel>Dokumenty</SectionLabel>
      <Card>
        <H>Co i gdzie złożyć</H>
        {r.documents.map((d, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 10, paddingVertical: 6 }}>
            <Icon name={I.doc} size={18} color={C.accent} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.ink, fontWeight: '500' }}>{d.name}</Text>
              <Muted>{d.where} · {d.when}</Muted>
            </View>
          </View>
        ))}
      </Card>
    </Screen>
  );
}
