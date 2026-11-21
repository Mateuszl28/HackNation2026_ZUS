import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { answerQuestion, calculate, SUGGESTED_QUESTIONS } from '@zus/engine';
import { usePlan } from '@/lib/plan-store';
import { C, useRemoteConfig } from '@/lib/ui';

interface Msg { role: 'user' | 'bot'; text: string }

export default function Assistant() {
  const { params } = useRemoteConfig();
  const { input } = usePlan();
  const [msgs, setMsgs] = useState<Msg[]>([{ role: 'bot', text: 'Cześć! Zapytaj o zasiłek, urlopy, dokumenty albo ryzyka. Działam także bez internetu.' }]);
  const [q, setQ] = useState('');
  const scroll = useRef<{ scrollToEnd: (o?: { animated?: boolean }) => void } | null>(null);

  const ask = (question: string) => {
    if (!question.trim()) return;
    const a = answerQuestion(question, params, input, calculate(input, params));
    setMsgs((m) => [...m, { role: 'user', text: question }, { role: 'bot', text: a.text }]);
    setQ('');
    setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Text style={{ fontSize: 26, fontWeight: '800', color: C.ink, padding: 16, paddingBottom: 4 }}>Asystent</Text>
        <ScrollView ref={scroll as never} contentContainerStyle={{ padding: 16, gap: 10 }}>
          {msgs.map((m, i) => (
            <View key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '88%', backgroundColor: m.role === 'user' ? C.accent : '#fff', borderRadius: 16, padding: 12, borderWidth: m.role === 'bot' ? 1 : 0, borderColor: C.border }}>
              <Text style={{ color: m.role === 'user' ? '#fff' : C.ink, fontSize: 15 }}>{m.text}</Text>
            </View>
          ))}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, paddingHorizontal: 12 }}>
          {SUGGESTED_QUESTIONS.map((s) => (
            <Pressable key={s} onPress={() => ask(s)} style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: C.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, marginRight: 8 }}>
              <Text style={{ fontSize: 12 }}>{s}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <View style={{ flexDirection: 'row', gap: 8, padding: 12, paddingBottom: 100 }}>
          <TextInput value={q} onChangeText={setQ} onSubmitEditing={() => ask(q)} placeholder="Zadaj pytanie…" style={{ flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 12, fontSize: 16 }} />
          <Pressable onPress={() => ask(q)} style={{ backgroundColor: C.brand, borderRadius: 12, paddingHorizontal: 16, justifyContent: 'center' }}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>Wyślij</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
