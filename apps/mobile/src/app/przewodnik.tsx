import { Text, View } from 'react-native';
import { C, Card, I, Icon, Muted, Screen, type IconName, useRemoteConfig } from '@/lib/ui';

export default function Guide() {
  const { params: p } = useRemoteConfig();
  const steps: { t: string; icon: IconName; i: string[] }[] = [
    { t: 'Ciąża – sprawdź ubezpieczenie', icon: I.info, i: [`Okres wyczekiwania na chorobowy: ${p.waitingPeriodDays.mandatory} dni (etat) / ${p.waitingPeriodDays.voluntary} dni (dobrowolne).`, 'Przedsiębiorco: płać składki w terminie – inaczej ubezpieczenie chorobowe ustaje.'] },
    { t: 'L4 w ciąży', icon: I.doc, i: ['e-ZLA z kodem „B” = 100% podstawy.', `Pracownica: pierwsze ${p.employerPaidDays.under50} dni płaci pracodawca.`, `Maks. ${p.sicknessPeriodDays} dni, potem świadczenie rehabilitacyjne.`] },
    { t: 'Poród – macierzyński', icon: I.baby, i: [`${p.maternityWeeksByChildren[0]} tyg. (1 dziecko), do ${p.prenatalMaxWeeks} tyg. przed porodem.`, `${p.motherObligatoryWeeks} tyg. wykorzystuje mama; resztę może przejąć tata.`, `Do ${p.oneApplicationDeadlineDays} dni po porodzie: wybór 81,5% za cały okres.`] },
    { t: 'Rodzicielski i ojcowski', icon: I.calendar, i: [`${p.parentalWeeks.single}/${p.parentalWeeks.multiple} tyg. („Za życiem” ${p.parentalWeeks.zaZyciemSingle}/${p.parentalWeeks.zaZyciemMultiple}), 70%.`, `${p.parentalNonTransferableWeeks} tyg. nieprzenoszalnych dla każdego rodzica.`, `Ojcowski: ${p.paternityDays} dni do 12. miesiąca życia dziecka.`] },
    { t: 'Powrót do pracy', icon: I.plan, i: ['Rodzicielski + praca do 1/2 etatu – urlop wydłuża się proporcjonalnie.', 'Ochrona przed zwolnieniem w ciąży i w trakcie urlopów.'] },
  ];
  return (
    <Screen title="Przewodnik" subtitle="Krok po kroku – od ciąży do powrotu do pracy">
      {steps.map((st, k) => (
        <View key={k} style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ alignItems: 'center' }}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: C.brand, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#fff', fontWeight: '800' }}>{k + 1}</Text>
            </View>
            {k < steps.length - 1 && <View style={{ width: 2, flex: 1, backgroundColor: '#cfe6d8', marginVertical: 4 }} />}
          </View>
          <Card style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Icon name={st.icon} size={18} color={C.brand} />
              <Text style={{ fontSize: 16, fontWeight: '700', color: C.ink, flex: 1 }}>{st.t}</Text>
            </View>
            {st.i.map((x) => (
              <View key={x} style={{ flexDirection: 'row', gap: 8, marginBottom: 6 }}>
                <Text style={{ color: C.brand, fontWeight: '900' }}>•</Text>
                <Text style={{ color: C.ink, flex: 1, lineHeight: 20 }}>{x}</Text>
              </View>
            ))}
          </Card>
        </View>
      ))}
      <Muted>Narzędzie informacyjne – wiążące decyzje wydaje ZUS lub płatnik składek.</Muted>
    </Screen>
  );
}
