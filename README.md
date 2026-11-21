# Zasiłkowy Przewodnik Przyszłego Rodzica

HackNation 2026 · wyzwanie ZUS. Narzędzie (web RWD + aplikacja mobilna), które na podstawie indywidualnej sytuacji ustala uprawnienia do zasiłku chorobowego w ciąży i zasiłku macierzyńskiego, liczy okres i wysokość świadczeń dla obojga rodziców i prowadzi przez wnioski.

## Struktura

```
packages/engine   – wspólny silnik (TypeScript): parametry prawne, kalkulatory, ryzyka, dokumenty, parser PDF→dane, sprawy demo, testy
apps/web          – Next.js (App Router) + Tailwind: aplikacja RWD/PWA + REST API + panel administracyjny
apps/mobile       – Expo / React Native: aplikacja Android/iOS na tym samym silniku, parametry pobierane z API
```

## Funkcje

| Wymaganie | Gdzie |
|---|---|
| Świadczenia w ciąży (chorobowy, kod „B”, okres wyczekiwania, wynagrodzenie chorobowe) | `/kalkulator` → zakładka „Chorobowy w ciąży” |
| Zintegrowany kalkulator: macierzyński, rodzicielski, ojcowski, uzupełniający (wcześniaki), „Za życiem”, ciąża mnoga, 81,5%, łączenie z pracą, podział między rodziców, adopcja, rodzina zastępcza, martwe urodzenie | `/kalkulator` |
| Indywidualna podstawa wymiaru (13,71%, minimum, limit dla dobrowolnych) | silnik `computeBase` |
| Gdzie złożyć dokumenty (pracodawca > 20 osób vs ZUS), terminy | wynik kalkulatora |
| Zagrożenia i ryzyka (umowa dla pozoru, zawyżona podstawa, ustanie ubezpieczenia, zadłużenie, korekta 81,5%) | kalkulator, pulpit, przewodnik |
| Symulator „Co jeśli…?”: podwyżka, koniec umowy (art. 177 § 3 KP), nowa umowa/firma, rezygnacja z dobrowolnego chorobowego – skutek dla zasiłku i ryzyka | `/co-jesli` |
| Organizacje wsparcia, oficjalne linki (ZUS, MRPiPS, PIP, RSC) | `/wsparcie` |
| Logowanie mObywatel (symulacja) | `/logowanie` |
| Pobranie danych z ZUS: ubezpieczenie, zadłużenie, e-ZLA (symulacja) | `/pulpit`, `GET /api/zus/:id` |
| Kontakt z PUE/eZUS (symulacja) | `/pulpit` |
| Wnioski o urlopy, ZAM, odpis aktu urodzenia (symulacja wysyłki) | `/wnioski` |
| Upload / wybór wniosków PDF, weryfikacja ubezpieczenia | `/sprawy`, `POST /api/parse` |
| Pracodawca (płatnik) wystawia Z-3 / Z-3a z 12 miesięcy wynagrodzeń i wysyła do sprawy w ZUS – urzędnik widzi je z kontrolą krzyżową | `/pracodawca` |
| Obsługa spraw przez urzędnika: kolejka spraw, karta osoby (dane ZUS, wnioski, wyliczenie), rekomendacja systemu, decyzja: przyznanie / odmowa / wezwanie – widoczna u obywatela | `/admin/sprawy` |
| Panel urzędnika: parametry prawne, organizacje, statystyki, historia zmian | `/admin` – logowanie urzędnika (demo: `urzednik` / `zus2026`; env `ADMIN_LOGIN`, `ADMIN_PASSWORD`, `ADMIN_SECRET`) |

## REST API

- `GET  /api/params` – parametry prawne i lista organizacji
- `PUT  /api/params` – zapis parametrów (sesja urzędnika)
- `GET  /api/admin/cases`, `GET /api/admin/cases/:id`, `POST /api/admin/cases/:id/decision` – sprawy i decyzje (sesja urzędnika)
- `POST /api/applications`, `GET /api/applications?caseId=` – wnioski obywatela do ZUS i jego decyzje
- `POST /api/admin/session` – logowanie urzędnika (ciasteczko httpOnly), `DELETE` – wylogowanie
- `POST /api/calculate` – `CalcInput` → okresy, kwoty, uprawnienia, ryzyka, dokumenty
- `POST /api/sickness` – zasiłek chorobowy w ciąży
- `POST /api/parse` – PDF (multipart `file`) → odczytane pola dokumentu ZUS
- `GET  /api/cases`, `GET /api/zus/:id` – sprawy demonstracyjne i symulacja danych ZUS

## Uruchomienie

```bash
npm install
npm run dev          # web: http://localhost:3000
npm test             # testy silnika (jednostkowe)
npm run test:api     # testy end-to-end REST API (na działającym serwerze, BASE_URL)
cd apps/mobile && npm install && npx expo start   # mobile (EXPO_PUBLIC_API_URL=http://<ip>:3000)
```

## Źródła prawne i weryfikacja

Parametry zweryfikowano z materiałami ZUS dla uczestników HackNation 2026: załącznik „maksymalny czas trwania zasiłków, wysokość, podstawa wymiaru”, wyciąg z ustawy zasiłkowej (m.in. art. 29a, 31 ust. 1–4a, 36–38, 49), wyciąg z Kodeksu pracy (art. 177, 180–183) oraz Poradnik dla rodziców ZUS 2026. Wszystkie wartości są edytowalne w panelu `/admin` (z historią zmian).

## Sztuczna inteligencja

Obliczenia i ustalanie uprawnień są deterministyczne (reguły z ustawy zasiłkowej i Kodeksu pracy) – nie korzystają z AI. Odczyt dokumentów PDF działa heurystycznie (ekstrakcja tekstu + reguły). Asystent działa na regułach; opcjonalnie (po ustawieniu `AI_GATEWAY_API_KEY` i `AI_MODEL`) model językowy przeredagowuje jego odpowiedź prostszym językiem – dostaje wyłącznie wyniki kalkulatora i nie zmienia liczb. AI wykorzystano także do tworzenia niektórych elementów kodu.

## Dane

Sprawy demonstracyjne w repozytorium są fikcyjne. Dokumenty udostępnione przez ZUS na potrzeby HackNation nie są umieszczane w repozytorium – można je wgrać lokalnie przez `/sprawy`.

> Narzędzie ma charakter informacyjny. Wiążące decyzje wydaje ZUS lub płatnik składek.
