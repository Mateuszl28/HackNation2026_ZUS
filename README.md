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
| Organizacje wsparcia, oficjalne linki (ZUS, MRPiPS, PIP, RSC) | `/wsparcie` |
| Logowanie mObywatel (symulacja) | `/logowanie` |
| Pobranie danych z ZUS: ubezpieczenie, zadłużenie, e-ZLA (symulacja) | `/pulpit`, `GET /api/zus/:id` |
| Kontakt z PUE/eZUS (symulacja) | `/pulpit` |
| Wnioski o urlopy, ZAM, odpis aktu urodzenia (symulacja wysyłki) | `/wnioski` |
| Upload / wybór wniosków PDF, weryfikacja ubezpieczenia | `/sprawy`, `POST /api/parse` |
| Panel administracyjny parametrów (stopy, wymiary, limity, organizacje) | `/admin` (token demo: `admin`, env `ADMIN_TOKEN`) |

## REST API

- `GET  /api/params` – parametry prawne i lista organizacji
- `PUT  /api/params` – zapis parametrów (nagłówek `x-admin-token`)
- `POST /api/calculate` – `CalcInput` → okresy, kwoty, uprawnienia, ryzyka, dokumenty
- `POST /api/sickness` – zasiłek chorobowy w ciąży
- `POST /api/parse` – PDF (multipart `file`) → odczytane pola dokumentu ZUS
- `GET  /api/cases`, `GET /api/zus/:id` – sprawy demonstracyjne i symulacja danych ZUS

## Uruchomienie

```bash
npm install
npm run dev          # web: http://localhost:3000
npm test             # testy silnika
cd apps/mobile && npm install && npx expo start   # mobile (EXPO_PUBLIC_API_URL=http://<ip>:3000)
```

## Źródła prawne i weryfikacja

Parametry zweryfikowano z materiałami ZUS dla uczestników HackNation 2026: załącznik „maksymalny czas trwania zasiłków, wysokość, podstawa wymiaru”, wyciąg z ustawy zasiłkowej (m.in. art. 29a, 31 ust. 1–4a, 36–38, 49), wyciąg z Kodeksu pracy (art. 177, 180–183) oraz Poradnik dla rodziców ZUS 2026. Wszystkie wartości są edytowalne w panelu `/admin` (z historią zmian).

## Sztuczna inteligencja

Obliczenia i ustalanie uprawnień są deterministyczne (reguły z ustawy zasiłkowej i Kodeksu pracy) – nie korzystają z AI. Odczyt dokumentów PDF działa heurystycznie (ekstrakcja tekstu + reguły). AI wykorzystano wyłącznie w procesie tworzenia niektórych elementów kodu.

## Dane

Sprawy demonstracyjne w repozytorium są fikcyjne. Dokumenty udostępnione przez ZUS na potrzeby HackNation nie są umieszczane w repozytorium – można je wgrać lokalnie przez `/sprawy`.

> Narzędzie ma charakter informacyjny. Wiążące decyzje wydaje ZUS lub płatnik składek.
