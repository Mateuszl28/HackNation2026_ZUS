import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CalcInput } from '@zus/engine';

/** Wspólny stan planu dla wszystkich zakładek, zapisywany lokalnie na urządzeniu. */
export const START_INPUT: CalcInput = {
  scenario: 'birth',
  eventDate: new Date(Date.now() + 120 * 86400000).toISOString().slice(0, 10),
  children: 1,
  mother: { title: 'employment', monthlyBase: 7000, largeEmployer: true },
  father: { title: 'employment', monthlyBase: 7000 },
  plan: { motherParentalWeeks: 32, fatherParentalWeeks: 9, paternity: true },
};

interface Store {
  input: CalcInput;
  setInput: (fn: CalcInput | ((i: CalcInput) => CalcInput)) => void;
  done: Record<string, boolean>;
  toggleDone: (id: string) => void;
}

const Ctx = createContext<Store | null>(null);
const KEY = 'zpr-plan-v1';

export function PlanProvider({ children }: { children: ReactNode }) {
  const [input, setInputState] = useState<CalcInput>(START_INPUT);
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (!raw) return;
        const v = JSON.parse(raw);
        if (v?.input?.eventDate) setInputState(v.input);
        if (v?.done) setDone(v.done);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (loaded) AsyncStorage.setItem(KEY, JSON.stringify({ input, done })).catch(() => {});
  }, [input, done, loaded]);

  const setInput = useCallback((fn: CalcInput | ((i: CalcInput) => CalcInput)) => setInputState((i) => (typeof fn === 'function' ? fn(i) : fn)), []);
  const toggleDone = useCallback((id: string) => setDone((d) => ({ ...d, [id]: !d[id] })), []);

  return <Ctx.Provider value={{ input, setInput, done, toggleDone }}>{children}</Ctx.Provider>;
}

export function usePlan() {
  const c = useContext(Ctx);
  if (!c) throw new Error('usePlan poza PlanProvider');
  return c;
}
