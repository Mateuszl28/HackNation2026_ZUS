import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { pln, type InsuranceTitle, type ParentInput } from '@zus/engine';
import { API_URL, C, Card, I, Icon, Muted, R, tap } from '@/lib/ui';

type Parsed = { formType?: string; title?: InsuranceTitle; monthlyBase?: number; computedBase?: number | null; eventDate?: string; insured?: boolean; warnings?: string[]; ocr?: { confidence: number }; error?: string };

/** Zdjęcie dokumentu (np. Z-3) → OCR na serwerze (POST /api/parse) → uzupełnienie danych mamy w kalkulatorze. */
export function ScanCard({ onApply }: { onApply: (p: { mother: Partial<ParentInput>; eventDate?: string }) => void }) {
  const [busy, setBusy] = useState(false);
  const [uri, setUri] = useState<string | null>(null);
  const [res, setRes] = useState<Parsed | null>(null);

  const pick = async (camera: boolean) => {
    tap();
    const perm = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return setRes({ error: 'Brak zgody na dostęp do ' + (camera ? 'aparatu.' : 'zdjęć.') });
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.85 };
    const r = camera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (r.canceled || !r.assets?.[0]) return;
    const a = r.assets[0];
    setUri(a.uri);
    setRes(null);
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', { uri: a.uri, name: a.fileName ?? 'dokument.jpg', type: a.mimeType ?? 'image/jpeg' } as unknown as Blob);
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 120_000);
      const j = (await fetch(`${API_URL}/api/parse`, { method: 'POST', body: fd, signal: ctrl.signal }).then((x) => x.json())) as Parsed;
      clearTimeout(t);
      setRes(j);
    } catch {
      setRes({ error: 'Brak połączenia z serwerem. Odczyt dokumentu wymaga internetu – kalkulator działa offline.' });
    } finally {
      setBusy(false);
    }
  };

  const base = res?.computedBase ?? res?.monthlyBase;
  const found = res && !res.error && (res.title || base || res.eventDate);

  const Btn = ({ label, icon, onPress }: { label: string; icon: typeof I.doc; onPress: () => void }) => (
    <Pressable disabled={busy} onPress={onPress} style={({ pressed }) => ({ flex: 1, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: R.sm, backgroundColor: C.brandLight, opacity: pressed || busy ? 0.6 : 1 })}>
      <Icon name={icon} size={18} color={C.brand} />
      <Text style={{ color: C.brand, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );

  return (
    <Card>
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 6 }}>
        <Icon name={I.scan} size={22} color={C.brand} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '700', fontSize: 15, color: C.ink }}>Sfotografuj dokument</Text>
          <Muted>Z-3, ZAM lub poświadczenie – odczytamy kwotę, datę i tytuł ubezpieczenia (OCR).</Muted>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
        <Btn label="Aparat" icon={I.camera} onPress={() => pick(true)} />
        <Btn label="Galeria" icon={I.photo} onPress={() => pick(false)} />
      </View>

      {(uri || busy) && (
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 12, alignItems: 'center' }}>
          {uri && <Image source={{ uri }} style={{ width: 64, height: 84, borderRadius: 8, backgroundColor: C.border }} />}
          <View style={{ flex: 1 }}>
            {busy && <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}><ActivityIndicator color={C.brand} /><Muted>Rozpoznaję tekst…</Muted></View>}
            {res?.error && <Text style={{ color: C.red, fontWeight: '600' }}>{res.error}</Text>}
            {res && !res.error && (
              <>
                <Text style={{ fontWeight: '700', color: C.ink }}>{res.formType ?? 'Dokument'}{res.ocr ? ` · OCR ${res.ocr.confidence}%` : ''}</Text>
                <Muted>
                  {[res.title && { employment: 'umowa o pracę', mandate: 'zlecenie', business: 'działalność', none: 'brak' }[res.title], base && pln(base), res.eventDate && `poród ${res.eventDate}`, res.insured === true && 'ubezpieczona', res.insured === false && 'BRAK ubezpieczenia'].filter(Boolean).join(' · ') || 'Nie znaleziono danych – zrób wyraźniejsze zdjęcie.'}
                </Muted>
              </>
            )}
          </View>
        </View>
      )}
      {found && (
        <Pressable
          onPress={() => {
            tap();
            onApply({ mother: { ...(res!.title ? { title: res!.title } : {}), ...(base ? { monthlyBase: Math.round(base) } : {}) }, eventDate: res!.eventDate });
            setRes(null);
            setUri(null);
          }}
          style={{ marginTop: 12, backgroundColor: C.brand, borderRadius: R.sm, paddingVertical: 12, alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>Wstaw do kalkulatora (mama)</Text>
        </Pressable>
      )}
    </Card>
  );
}
