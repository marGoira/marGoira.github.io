/**
 * Matkalennon "aurinkokunnat". Mittakaava on pelillinen, ei todellinen:
 * yksikkö ≈ pikseli lähimmällä zoomilla, aika sekunteina.
 *
 * mu = gravitaatioparametri (G·M). Ympyräradan nopeus v = √(mu / r).
 */
export interface OrbitBody {
  id: string;
  name: string;
  /** Radan säde keskuskappaleesta */
  r: number;
  /** Kulmanopeus (rad/s), lasketaan automaattisesti; 0 = paikallaan pysyvä (madonreikä) */
  omega: number;
  mu: number;
  radius: number;
  /** Kaappaussäde: tämän sisällä riittävän hitaasti = kiertoradalla */
  capR: number;
  color: string;
  ring?: boolean;
  fixed?: boolean;
}

export interface OrbitSystem {
  id: "sun" | "earth";
  central: { name: string; mu: number; radius: number; color: string };
  bodies: OrbitBody[];
  /** Aluksen lähtörata: kotiplaneetta (aurinkokunta) tai pysäköintirata (Maan järjestelmä) */
  home: { bodyId: string } | { parkingR: number };
  /** Kantama × tämä = delta-v-budjetti tässä järjestelmässä */
  dvPerRange: number;
  /** Matkamoottorin kiihtyvyys perusaluksella (yks./s²) */
  accel: number;
  /** Suurin suhteellinen nopeus kaappaukseen */
  vCapture: number;
  zooms: number[];
  defaultZoom: number;
  /** Ennustimen aika-askel ja askelmäärä (perus / Newtonin mekaniikalla) */
  predict: { h: number; base: number; full: number };
  /** Tätä kauempana alus katsotaan kadonneeksi */
  escapeR: number;
}

const circ = (mu: number, r: number) => Math.sqrt(mu / (r * r * r));

const SUN_MU = 10966; // Maan kierros ≈ 60 s

function sunSystem(): OrbitSystem {
  const b = (id: string, name: string, r: number, mu: number, radius: number, capR: number, color: string, extra: Partial<OrbitBody> = {}): OrbitBody =>
    ({ id, name, r, omega: circ(SUN_MU, r), mu, radius, capR, color, ...extra });
  return {
    id: "sun",
    central: { name: "Aurinko", mu: SUN_MU, radius: 12, color: "#ffcf4a" },
    bodies: [
      b("earth", "Maa", 100, 0.5, 3, 0, "#3f7cff"),
      b("mars", "Mars", 152, 0.35, 2.5, 8, "#cf6a3e"),
      b("ceres", "Ceres", 277, 0.03, 1.5, 6, "#8d8a96"),
      b("jupiter", "Jupiter", 520, 30, 7, 28, "#c99a6a"),
      b("saturn", "Saturnus", 950, 12, 6, 24, "#e0c88a", { ring: true }),
      b("wormhole", "Madonreikä", 420, 0, 4, 12, "#b48cff", { fixed: true, omega: 0 }),
    ],
    home: { bodyId: "earth" },
    dvPerRange: 0.5,
    accel: 0.6,
    vCapture: 1.3,
    zooms: [0.06, 0.12, 0.25, 0.5, 1, 2, 4],
    defaultZoom: 3,
    predict: { h: 1, base: 50, full: 450 },
    escapeR: 1700,
  };
}

const EARTH_MU = 5330; // Kuun kierros ≈ 40 s

function earthSystem(): OrbitSystem {
  return {
    id: "earth",
    central: { name: "Maa", mu: EARTH_MU, radius: 6, color: "#3f7cff" },
    bodies: [
      { id: "moon", name: "Kuu", r: 60, omega: circ(EARTH_MU, 60), mu: 66, radius: 1.7, capR: 9, color: "#b9b4a8" },
    ],
    home: { parkingR: 20 },
    dvPerRange: 3.5,
    accel: 8,
    vCapture: 4.5,
    zooms: [0.5, 1, 2, 4, 8],
    defaultZoom: 2,
    predict: { h: 0.05, base: 100, full: 400 },
    escapeR: 420,
  };
}

export function getSystem(id: "sun" | "earth"): OrbitSystem {
  return id === "sun" ? sunSystem() : earthSystem();
}
