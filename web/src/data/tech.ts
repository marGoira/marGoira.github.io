/**
 * Kehityspuu. Vaikutukset lasketaan tiedostossa state/stats.ts, joten uusi teknologia =
 * rivi tähän + sen vaikutus stats()-funktioon.
 */
export type Branch = "Moottorit" | "Polttoaineet" | "Fysiikka";

export interface Tech {
  id: string;
  branch: Branch;
  name: string;
  desc: string;
  effect: string;
  cost: number;
  requires: string[];
}

export const BRANCHES: Branch[] = ["Moottorit", "Polttoaineet", "Fysiikka"];

export const TECH: Tech[] = [
  { id: "m1", branch: "Moottorit", name: "Kellosuutin", desc: "Paremmin muotoiltu suutin purkaa kaasun tehokkaammin.", effect: "Työntövoima +20 %", cost: 20, requires: [] },
  { id: "m2", branch: "Moottorit", name: "Ioniveto", desc: "Sähköisesti kiihdytetyt ionit: heikko työntö, valtava kestävyys matkalla.", effect: "Kantama +3", cost: 50, requires: ["m1"] },
  { id: "m3", branch: "Moottorit", name: "Fuusiopulssi", desc: "Pienet fuusioräjähdykset työntävät alusta kuin jättimäinen moottori.", effect: "Työntövoima +30 %, kantama +4", cost: 120, requires: ["m2", "p2"] },
  { id: "m4", branch: "Moottorit", name: "Kvanttiresonaattori", desc: "Fiktiivinen veto, joka ammentaa energiaa tyhjiön värähtelystä.", effect: "Kantama +6", cost: 250, requires: ["m3"] },

  { id: "p1", branch: "Polttoaineet", name: "Metaani ja happi", desc: "Puhtaammin palava seos, jota voi tulevaisuudessa valmistaa Marsissa.", effect: "Tankki +30 %", cost: 20, requires: [] },
  { id: "p2", branch: "Polttoaineet", name: "Nestevety", desc: "Kevein polttoaine: paras hyötysuhde kemiallisista vaihtoehdoista.", effect: "Kulutus −25 %, kantama +2", cost: 60, requires: ["p1"] },
  { id: "p3", branch: "Polttoaineet", name: "Metallinen vety", desc: "Valtavassa paineessa tiivistetty vety varastoi energiaa moninkertaisesti.", effect: "Tankki +50 %", cost: 140, requires: ["p2"] },
  { id: "p4", branch: "Polttoaineet", name: "Antimateriakatalyytti", desc: "Hippunen antimateriaa käynnistää reaktion, joka polttaa lähes kaiken.", effect: "Kulutus −40 %, kantama +5", cost: 260, requires: ["p3"] },

  { id: "f1", branch: "Fysiikka", name: "Newtonin mekaniikka", desc: "Kun liike tunnetaan, rata voidaan laskea etukäteen.", effect: "Pitkä lentoradan ennuste ja lähin ohitus", cost: 15, requires: [] },
  { id: "f2", branch: "Fysiikka", name: "Oberthin ilmiö", desc: "Polttaminen syvällä painovoimakuopassa, suurella nopeudella, tuottaa enemmän liike-energiaa.", effect: "Poltto planeetan lähellä −40 %, autopilotti −25 % kantamaa", cost: 50, requires: ["f1"] },
  { id: "f3", branch: "Fysiikka", name: "Gyrovakain", desc: "Hyrrät pitävät aluksen pystyssä, kun ohjaimet päästetään irti.", effect: "Automaattinen oikaisu, kääntö +50 %", cost: 80, requires: ["f1"] },
  { id: "f4", branch: "Fysiikka", name: "Aika-avaruuden kaarevuus", desc: "Einsteinin teoria: massa taivuttaa avaruutta, ja kaarteita voi oikaista.", effect: "Kantama +3", cost: 150, requires: ["f2"] },
  { id: "f5", branch: "Fysiikka", name: "Madonreikäteoria", desc: "Kaksi kaukaista pistettä voi yhdistää tunnelilla. Riittääkö energia avaamaan sen?", effect: "Avaa madonreiän toiseen galaksiin", cost: 300, requires: ["f4", "m3"] },
];

export const techById = (id: string): Tech => {
  const t = TECH.find((x) => x.id === id);
  if (!t) throw new Error(`Tuntematon teknologia ${id}`);
  return t;
};
