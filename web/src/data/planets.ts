/**
 * Laskeutumiskohteet. Uuden kohteen lisääminen:
 * 1) lisää rivi tähän, 2) lisää sen kiertoratakappale tiedostoon physics/systems.ts,
 * 3) halutessasi taustapiirto tiedostoon scenes/landerBackgrounds.ts.
 */
export type PlanetId = "moon" | "mars" | "ceres" | "europa" | "titan" | "exo";

export interface Mission {
  title: string;
  text: string;
  credits: number;
  research: number;
}

export interface Planet {
  id: PlanetId;
  name: string;
  /** Pintapainovoima, m/s² */
  g: number;
  /** Suositeltu kantama autopilotille (ja vaikeustason mittari). */
  dist: number;
  /** Vaatiiko madonreikäteorian. */
  wormhole?: boolean;
  /** Mihin aurinkokuntaan matkalento tehdään ja mikä kappale on kohde siellä. */
  system: "earth" | "sun";
  orbitTarget: string;
  /** Maaston rosoisuus, 0.5 = loiva, 1.6 = jyrkkä */
  rough: number;
  /** Tuulen voimakkuus (px/s²) laskeutumisessa */
  wind: number;
  /** Ilmanvastus (0 = tyhjiö) */
  drag: number;
  sky: string;
  ground: string;
  top: string;
  fact: string;
  mission: Mission;
}

export const PLANETS: Planet[] = [
  {
    id: "moon", name: "Kuu", g: 1.62, dist: 1, system: "earth", orbitTarget: "moon",
    rough: 0.8, wind: 0, drag: 0, sky: "#04050b", ground: "#77736b", top: "#b9b4a8",
    fact: "Kuun painovoima on noin kuudesosa Maan painovoimasta, joten alus leijuu pitkään.",
    mission: { title: "Etelänavan tukikohta", text: "Toimita happisäiliöt Kuun tutkimusasemalle.", credits: 60, research: 25 },
  },
  {
    id: "mars", name: "Mars", g: 3.71, dist: 3, system: "sun", orbitTarget: "mars",
    rough: 1.1, wind: 9, drag: 0.04, sky: "#2b140e", ground: "#8e3c22", top: "#cf6a3e",
    fact: "Marsissa on aurinkokunnan korkein tulivuori, Olympus Mons. Ohut ilmakehä ja puuskittainen tuuli heittelevät alusta.",
    mission: { title: "Mönkijän varaosat", text: "Vie uusi pyörä jumiin jääneelle tutkimusmönkijälle.", credits: 120, research: 50 },
  },
  {
    id: "ceres", name: "Ceres", g: 0.28, dist: 5, system: "sun", orbitTarget: "ceres",
    rough: 1.6, wind: 0, drag: 0, sky: "#030308", ground: "#4f4d55", top: "#8d8a96",
    fact: "Ceres on asteroidivyöhykkeen suurin kappale ja kääpiöplaneetta. Painovoima on niin heikko, että liika työntö lennättää aluksen pois.",
    mission: { title: "Suolaläiskien näyte", text: "Kerää näyte kraatterin kirkkaista suolaesiintymistä.", credits: 160, research: 70 },
  },
  {
    id: "europa", name: "Europa", g: 1.31, dist: 8, system: "sun", orbitTarget: "jupiter",
    rough: 0.6, wind: 0, drag: 0, sky: "#05070f", ground: "#7f95a8", top: "#dbe9f2",
    fact: "Jupiterin kuun Europan jääkuoren alla on todennäköisesti valtameri, jossa on enemmän vettä kuin Maan merissä.",
    mission: { title: "Jääkairaus", text: "Laske kairauslaite jääkuoren halkeaman viereen.", credits: 250, research: 110 },
  },
  {
    id: "titan", name: "Titan", g: 1.35, dist: 12, system: "sun", orbitTarget: "saturn",
    rough: 0.9, wind: 4, drag: 0.55, sky: "#3a250c", ground: "#6d4a1e", top: "#b7843d",
    fact: "Saturnuksen kuu Titan on ainoa kuu, jolla on paksu ilmakehä. Sen pinnalla on metaanijärviä ja -sateita.",
    mission: { title: "Metaanijärven poiju", text: "Asenna mittauspoiju Kraken Maren rannalle.", credits: 350, research: 150 },
  },
  {
    id: "exo", name: "Aurora b", g: 2.4, dist: 6, wormhole: true, system: "sun", orbitTarget: "wormhole",
    rough: 1.3, wind: 12, drag: 0.08, sky: "#160a26", ground: "#2f6b5a", top: "#7fe3b8",
    fact: "Kuvitteellinen planeetta toisessa galaksissa, kahden auringon kiertoradalla. Kukaan ei ole käynyt täällä.",
    mission: { title: "Ensimmäinen kontakti", text: "Laskeudu ja pystytä Maan lippu vieraaseen maailmaan.", credits: 600, research: 250 },
  },
];

export const planetById = (id: string): Planet => {
  const p = PLANETS.find((x) => x.id === id);
  if (!p) throw new Error(`Tuntematon kohde ${id}`);
  return p;
};
