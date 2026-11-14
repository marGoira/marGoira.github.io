/** Hull classes and their pixel art. Each character is one pixel, '.' is empty. */
export interface Hull {
  name: string;
  cost: number;
}

export const HULLS: Hull[] = [
  { name: "Spark", cost: 0 },
  { name: "Comet", cost: 150 },
  { name: "Nova", cost: 400 },
  { name: "Pulsar", cost: 900 },
];

/** 9 × 8 pixels. Centre (4.5, 4), landing legs on the bottom row. */
export const SPRITES: string[][] = [
  ["....W....", "...WWW...", "...WBW...", "..WWWWW..", "..WWWWW..", "..RWWWR..", ".RR...RR.", ".R.....R."],
  ["....R....", "...WWW...", "...WBW...", "..WWWWW..", ".RWWBWWR.", ".RWWWWWR.", ".R.DDD.R.", "R.......R"],
  ["....G....", "...GWG...", "..WWBWW..", "..WBBBW..", ".GWWWWWG.", "GGWWWWWGG", ".G.DDD.G.", "G.......G"],
  ["...PCP...", "..PWWWP..", "..WBBBW..", ".PWBCBWP.", "PPWWWWWPP", "P.WWWWW.P", "P..DDD..P", "PP.....PP"],
];

export const PALETTE: Record<string, string> = {
  W: "#e8e4d6", B: "#6fe3ff", R: "#ff6b4a", D: "#4a4e66", G: "#ffc94a", P: "#b48cff", C: "#ffffff",
};
