import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { answerQuestion, calculate, SUGGESTED_QUESTIONS } from '@zus/engine';
import { C, I, Icon, Pill, R, Screen, shadow, tap, useRemoteConfig } from '@/lib/ui';
import { usePlan } from '@/lib/plan-store';

interface Msg { role: 'user' | 'bot'; text: string }

export default function Assistant() {
  const { params } = useRemoteConfig();
  const { input } = usePlan();
  const [msgs, setMsgs] = useState<Msg[]>([{ role: 'bot', text: 'Cześć! 👋 Zapytaj o zasiłek, urlopy, dokumenty albo ryzyka. Odpowiadam na podstawie Twojego planu – także bez internetu.' }]);
  const [q, setQ] = useState('');
  const scroll = useRef<{ scrollToEnd: (o?: { animated?: boolean }) => void } | null>(null);

  const ask = (question: string) => {
    if (!question.trim()) return;
    tap();
    const a = answerQuestion(question, params, input, calculate(input, params));
    setMsgs((m) => [...m, { role: 'user', text: question }, { role: 'bot', text: a.text }]);
    setQ('');
    setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 60);
  };

  return (
    <Screen title="Asystent" subtitle="Odpowiedzi z reguł ustawy – bez zgadywania kwot" scroll={false}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView ref={scroll as never} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 12, gap: 10 }} showsVerticalScrollIndicator={false}>
          {msgs.map((m, i) => {
            const me = m.role === 'user';
            return (
              <View key={i} style={{ flexDirection: 'row', justifyContent: me ? 'flex-end' : 'flex-start', gap: 8 }}>
                {!me && (
                  <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: C.brandLight, alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
                    <Icon name={I.bot} size={16} color={C.brand} />
                  </View>
                )}
                <View style={[{ maxWidth: '82%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, backgroundColor: me ? C.brand : C.surface }, me ? { borderBottomRightRadius: 6 } : [{ borderBottomLeftRadius: 6 }, shadow]]}>
                  <Text style={{ color: me ? '#fff' : C.ink, fontSize: 15, lineHeight: 21 }}>{m.text}</Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8 }}>
          {SUGGESTED_QUESTIONS.map((sq) => <Pill key={sq} label={sq} onPress={() => ask(sq)} />)}
        </ScrollView>
        <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 12, marginBottom: Platform.OS === 'ios' ? 96 : 12, backgroundColor: C.surface, borderRadius: R.pill, paddingLeft: 16, paddingRight: 6, paddingVertical: 6 }, shadow]}>
          <TextInput value={q} onChangeText={setQ} onSubmitEditing={() => ask(q)} placeholder="Zadaj pytanie…" placeholderTextColor="#9ca3af" style={{ flex: 1, fontSize: 16, color: C.ink, paddingVertical: 8 }} returnKeyType="send" />
          <Pressable onPress={() => ask(q)} disabled={!q.trim()} accessibilityLabel="Wyślij" style={({ pressed }) => ({ width: 42, height: 42, borderRadius: 21, backgroundColor: q.trim() ? C.brand : '#d1d5db', alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}>
            <Icon name={I.send} size={20} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
