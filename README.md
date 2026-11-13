# Kantama

Retro-pikselityylinen avaruuspeli: lennä Maasta planeetoille oikealla painovoimalla, laskeudu Mars Lander -tyyliin, kerää tutkimuspisteitä ja kehitä moottoreita, polttoaineita ja fysiikan teorioita, kunnes madonreikä vie toiseen galaksiin.

```
kantama/
├── web/        Peli: TypeScript + Vite + Canvas (toimii yksin, ilman backendiä)
├── api/        Valinnainen pilvitallennus: C# Azure Functions (.NET 8 isolated) + Table Storage
├── infra/      Terraform: Static Web App, Function App (Flex Consumption), Storage, App Insights
└── docker-compose.yml   Azurite (Azure Storage -emulaattori) paikalliseen API-kehitykseen
```

## Pelaa paikallisesti

Tarvitset Node.js 20+.

```bash
cd web
npm install
npm run dev          # http://localhost:5173
npm run dev:phone    # sama, mutta näkyy myös puhelimelle samassa wifissä
```

`dev:phone` tulostaa osoitteen muotoa `http://192.168.x.x:5173`. Avaa se iPhonen Safarissa. Muutokset päivittyvät heti, kun tallennat tiedoston.

Peli tallentaa edistymisen selaimen localStorageen. Backendiä ei tarvita.

## Pelin rakenne (web/src)

| Kansio | Sisältö |
| --- | --- |
| `main.ts` | Käynnistys, näkymien vaihto, pelisilmukka |
| `data/` | Pelisisältö: planeetat, kehityspuu, alukset. **Uusi sisältö lisätään yleensä tänne.** |
| `state/` | Tallennettava tila (`gameState.ts`) ja aluksen ominaisuudet tutkimuksista (`stats.ts`) |
| `physics/` | Matkalennon kiertoratafysiikka (`orbital.ts`) ja järjestelmien parametrit (`systems.ts`) |
| `scenes/` | Pelinäkymät: tähtikartta, matkalento, laskeutuminen |
| `ui/` | Valikot: kehityspuu ja telakka |
| `render/` | Pikseligrafiikan piirto |
| `api/` | Valinnainen pilvisynkronointi |

### Pelisilmukka

1. **Tähtikartta**: valitse kohde.
2. **Matkalento** (`orbitScene.ts`): ylhäältä kuvattu aurinkokunta. Aluksella on delta-v-budjetti = kantama × järjestelmän kerroin. Polta myötäsuuntaan, osu kohteen kaappausympyrään riittävän hitaasti. Planeettojen painovoima vaikuttaa oikeasti, joten painovoimalinko toimii. Kello käynnistyy vasta ensimmäisestä poltosta.
3. **Laskeutuminen** (`landerScene.ts`): sivukuvanto, kohteen oma painovoima, tuuli ja ilmakehä. Alustan kerroin (×1–×3) kertoo palkkion.
4. **Tutkimus ja telakka**: TP:llä teknologiaa, krediiteillä runkoja.

Kun kohteessa on käyty kerran, autopilotti hyppää suoraan laskeutumiseen.

### Näin lisäät sisältöä

**Uusi teknologia:** lisää rivi `data/tech.ts`:ään ja sen vaikutus `state/stats.ts`:n `stats()`-funktioon.

**Uusi kohde:** lisää rivi `data/planets.ts`:ään, kiertoratakappale `physics/systems.ts`:ään ja halutessasi tausta `scenes/landerBackgrounds.ts`:ään. Kartan sijainti asetetaan `scenes/mapScene.ts`:n `bodyPos`-funktiossa.

**Fysiikan viritys:** `physics/systems.ts` sisältää kaiken säädettävän: gravitaatioparametrit, kaappaussäteet, moottorin kiihtyvyyden, delta-v-kertoimen ja ennustimen pituuden.

Testaa fysiikkaa ilman selainta: `npm run sim` ajaa ihanteelliset siirtoradat jokaiseen kohteeseen ja kertoo, osuvatko ne kaappausympyrään.

## GitHub Pages

Peli toimii GitHub Pagesissa sellaisenaan, koska se on pelkkiä staattisia tiedostoja ja tallennus menee selaimeen. Build käyttää suhteellisia polkuja, joten sama build toimii sekä osoitteessa `xxx.github.io` että alikansiossa `xxx.github.io/kantama/`.

1. Luo GitHubiin repo, esimerkiksi `kantama`, ja puske tämä kansio sinne `main`-haaraan.
2. Valitse repossa **Settings → Pages → Source: GitHub Actions**.
3. Workflow `.github/workflows/pages.yml` julkaisee pelin jokaisesta pushista. Se löytyy osoitteesta `https://xxx.github.io/kantama/`.

Jos peli halutaan nimenomaan `xxx.github.io`-repon sisälle, aja `npm run build` ja kopioi `web/dist`-kansion sisältö sen repon alikansioon (esim. `kantama/`).

Pilvitallennuksen voi kytkeä myöhemmin lisäämällä repon Variables-osioon `VITE_API_URL`. Lisää silloin `https://xxx.github.io` myös Terraformin `extra_cors_origins`-listaan.

## Pilvitallennus paikallisesti (valinnainen)

Tarvitset .NET 8 SDK:n, Azure Functions Core Tools v4:n ja Dockerin.

```bash
docker compose up -d                      # Azurite: blob, queue, table
cd api
cp local.settings.json.example local.settings.json
func start                                # http://localhost:7071/api/health

cd ../web
cp .env.example .env.local                # aseta VITE_API_URL=/api
npm run dev                               # Vite ohjaa /api-kutsut Functionsille
```

Rajapinta:

| Kutsu | Toiminto |
| --- | --- |
| `GET /api/saves/{playerId}` | Palauttaa tallennuksen tai 404 |
| `PUT /api/saves/{playerId}` | Tallentaa. 409, jos pilvessä on uudempi versio (toinen laite) |
| `GET /api/health` | Terveystarkistus |

Pelaajan id on GUID, joka luodaan selaimessa. Se toimii toistaiseksi ainoana avaimena, joten kirjautuminen kannattaa lisätä ennen kuin pelaajia on muitakin kuin perhe.

## Pilveen (kun on sen aika)

```bash
cd infra
cp terraform.tfvars.example terraform.tfvars   # lisää subscription_id
az login
terraform init
terraform apply

# Backend
cd ../api
func azure functionapp publish $(terraform -chdir=../infra output -raw function_app_name)

# Frontend
cd ../web
echo "VITE_API_URL=$(terraform -chdir=../infra output -raw api_url)" > .env.production
npm run build
npx @azure/static-web-apps-cli deploy ./dist \
  --deployment-token $(terraform -chdir=../infra output -raw swa_deployment_token) --env production
```

### Mitä Terraform luo

| Resurssi | Miksi | Hinta harrastuskäytössä |
| --- | --- | --- |
| Static Web App (Free) | Pelin HTML/JS/CSS CDN:n kautta | 0 € |
| Function App (Flex Consumption, .NET 8) | Tallennusrajapinta | käytännössä 0 € (ilmaiskiintiö) |
| Storage Account | Table: tallennukset. Blob: julkaisupaketti + `replays`-säiliö tulevaisuutta varten | senttejä/kk |
| Log Analytics + Application Insights | Lokit ja virheet | pieni, 30 pv säilytys |

Valinnat:

- **Table Storage vs. Cosmos DB:** tallennus on yksi avain–arvo-rivi per pelaaja, joten Table Storage riittää ja on halvin. Cosmos DB (serverless) on järkevä siirtymä, kun tulee tulostaulut tai hakuja.
- **Avaimettomuus:** Storage Accountin jaetut avaimet ovat pois päältä. Function App käyttää managed identityä (roolit `main.tf`:n lopussa).
- **Erillinen Function App eikä SWA:n managed API:** saat suoran hallinnan (Flex Consumption, identiteetti, App Insights). Selain kutsuu rajapintaa suoraan, CORS on määritelty Terraformissa.

Huom: Terraform- ja C#-koodia ei ole vielä ajettu tai käännetty. Aja `terraform validate` ja `dotnet build` ensimmäiseksi, ja korjaa mahdolliset provider-versioerot.

## Kehitysideoita

- Pinnalla ajettava mönkijä, kaivaminen ja tuhoutuva maasto (MineBombers-henki)
- Tehtäväketjut: Kuun tukikohdan rakentaminen vaiheittain
- Äänet ja värinä (Web Audio API, `navigator.vibrate`)
- Löytöjen kirja: kerättävät planeettakortit faktoineen
- PWA (manifest + service worker), jotta peli asentuu iPhonen kotinäytölle
- GitHub Actions: build + Terraform plan pull requesteille
