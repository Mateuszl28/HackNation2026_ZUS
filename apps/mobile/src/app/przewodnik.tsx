import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C, Card, H, Muted, useRemoteConfig } from '@/lib/ui';

export default function Guide() {
  const { params: p } = useRemoteConfig();
  const steps = [
    { t: 'Ciąża – sprawdź ubezpieczenie', i: [`Okres wyczekiwania na chorobowy: ${p.waitingPeriodDays.mandatory} dni (etat) / ${p.waitingPeriodDays.voluntary} dni (dobrowolne).`, 'Przedsiębiorco: płać składki w terminie – inaczej ubezpieczenie chorobowe ustaje.'] },
    { t: 'L4 w ciąży', i: ['e-ZLA z kodem „B” = 100% podstawy.', `Pracownica: pierwsze ${p.employerPaidDays.under50} dni płaci pracodawca.`, `Maks. ${p.sicknessPeriodDays} dni.`] },
    { t: 'Poród – macierzyński', i: [`${p.maternityWeeksByChildren[0]} tyg. (1 dziecko), do ${p.prenatalMaxWeeks} tyg. przed porodem.`, `${p.motherObligatoryWeeks} tyg. wykorzystuje matka; resztę może przejąć ojciec.`, `Do ${p.oneApplicationDeadlineDays} dni po porodzie: wybór ${p.rates.oneApplication * 100}% za cały okres.`] },
    { t: 'Rodzicielski i ojcowski', i: [`${p.parentalWeeks.single}/${p.parentalWeeks.multiple} tyg. (Za życiem ${p.parentalWeeks.zaZyciemSingle}/${p.parentalWeeks.zaZyciemMultiple}), ${p.rates.parental * 100}%.`, `${p.parentalNonTransferableWeeks} tyg. nieprzenoszalnych dla każdego rodzica.`, `Ojcowski: ${p.paternityDays} dni do 12. miesiąca życia dziecka.`] },
    { t: 'Powrót do pracy', i: ['Rodzicielski + praca do 1/2 etatu – urlop wydłuża się proporcjonalnie.', 'Ochrona przed zwolnieniem w ciąży i w trakcie urlopów.'] },
  ];
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        <Text style={{ fontSize: 26, fontWeight: '800', color: C.ink, marginBottom: 12 }}>Przewodnik</Text>
        {steps.map((s, k) => (
          <Card key={k}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: C.brand, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#fff', fontWeight: '700' }}>{k + 1}</Text></View>
              <H>{s.t}</H>
            </View>
            {s.i.map((x) => <Text key={x} style={{ color: C.ink, marginBottom: 4 }}>• {x}</Text>)}
          </Card>
        ))}
        <Muted>Narzędzie informacyjne – wiążące decyzje wydaje ZUS lub płatnik składek.</Muted>
      </ScrollView>
    </SafeAreaView>
  );
}
