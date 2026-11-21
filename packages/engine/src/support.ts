export interface SupportOrg {
  name: string;
  topics: ("strata" | "wczesniak" | "choroba" | "porod" | "kryzys")[];
  description: string;
  url?: string;
  phone?: string;
}

// Lista edytowalna w panelu administracyjnym.
export const SUPPORT_ORGS: SupportOrg[] = [
  { name: "Fundacja Wcześniak Rodzice – Rodzicom", topics: ["wczesniak"], description: "Wsparcie rodziców wcześniaków: informacje, grupy wsparcia, pomoc w szpitalu i po wypisie.", url: "https://wczesniak.pl" },
  { name: "Fundacja Rodzić po Ludzku", topics: ["porod", "strata"], description: "Prawa pacjentki w okołoporodowej opiece, wsparcie po stracie dziecka i poronieniu.", url: "https://rodzicpoludzku.pl" },
  { name: "Fundacja Gajusz – hospicjum perinatalne", topics: ["choroba", "strata"], description: "Opieka nad rodzinami spodziewającymi się ciężko chorego dziecka; wsparcie w żałobie.", url: "https://gajusz.org.pl" },
  { name: "Warszawskie Hospicjum dla Dzieci", topics: ["choroba", "strata"], description: "Hospicjum perinatalne i domowe, wsparcie psychologiczne dla rodziców.", url: "https://hospicjum.waw.pl" },
  { name: "Telefon zaufania dla dorosłych w kryzysie emocjonalnym", topics: ["kryzys", "strata"], description: "Bezpłatna, całodobowa pomoc psychologiczna.", phone: "116 123" },
  { name: "Rzecznik Praw Pacjenta – infolinia", topics: ["porod", "choroba"], description: "Informacja o prawach pacjenta, także w opiece okołoporodowej.", phone: "800 190 590", url: "https://www.gov.pl/web/rpp" },
];

export const OFFICIAL_LINKS = [
  { name: "ZUS – zasiłek macierzyński", url: "https://www.zus.pl" },
  { name: "Ministerstwo Rodziny – urlop rodzicielski", url: "https://www.gov.pl/web/rodzina/urlop-rodzicielski" },
  { name: "PIP – rodzicielstwo", url: "https://www.pip.gov.pl/dla-pracodawcow/porady-prawne/rodzicielstwo" },
  { name: "Rejestr stanu cywilnego – odpis aktu urodzenia", url: "https://www.gov.pl/web/cyfryzacja/rejestr-stanu-cywilnego" },
  { name: "PUE / eZUS", url: "https://www.zus.pl/ezus" },
];
