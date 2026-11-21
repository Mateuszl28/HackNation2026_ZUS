import Script from "next/script";

/** Ustawia motyw przed hydracją (bez mignięcia jasnego tła): zapisany wybór albo ustawienie systemu. */
export default function ThemeScript() {
  const code = `try{var t=localStorage.getItem('zpr-theme');if(!t){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.dataset.theme=t}catch(e){}`;
  return (
    <Script id="zpr-theme" strategy="beforeInteractive">
      {code}
    </Script>
  );
}
