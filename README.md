# Kantama

A retro pixel-art space game: fly from Earth to the planets under real gravity, land Mars Lander style, collect research points and develop engines, fuels and physics theories until a wormhole takes you to another galaxy.

("Kantama" is Finnish for "range", the ship stat that decides how far you can fly.)

```
kantama/
├── web/        The game: TypeScript + Vite + Canvas (runs on its own, no backend needed)
├── api/        Optional cloud save: C# Azure Functions (.NET 8 isolated) + Table Storage
├── infra/      Terraform: Static Web App, Function App (Flex Consumption), Storage, App Insights
└── docker-compose.yml   Azurite (Azure Storage emulator) for local API development
```

## Play locally

You need Node.js 20+.

```bash
cd web
npm install
npm run dev          # http://localhost:5173
npm run dev:phone    # same, but also reachable from a phone on the same Wi-Fi
```

`dev:phone` prints an address like `http://192.168.x.x:5173`. Open it in Safari on an iPhone. Changes show up as soon as you save a file.

The game saves progress to the browser's localStorage. No backend is needed.

## Game structure (web/src)

| Folder | Contents |
| --- | --- |
| `main.ts` | Startup, view switching, game loop |
| `data/` | Game content: planets, tech tree, ships. **New content usually goes here.** |
| `state/` | Persistent state (`gameState.ts`) and ship stats derived from research (`stats.ts`) |
| `physics/` | Transfer flight orbital physics (`orbital.ts`) and system parameters (`systems.ts`) |
| `scenes/` | Gameplay views: star map, transfer flight, landing |
| `ui/` | Menus: tech tree and shipyard |
| `render/` | Pixel art drawing |
| `api/` | Optional cloud sync |

### Game loop

1. **Star map**: pick a destination.
2. **Transfer flight** (`orbitScene.ts`): a top-down solar system. The ship has a delta-v budget = range × the system's multiplier. Burn prograde and hit the target's capture circle slowly enough. Planetary gravity really applies, so gravity assists work. The clock only starts at your first burn.
3. **Landing** (`landerScene.ts`): side view with the destination's own gravity, wind and atmosphere. The pad multiplier (×1–×3) sets the reward.
4. **Research and shipyard**: spend RP on technology and credits on hulls.

Once you have visited a destination, the autopilot skips straight to the landing.

### Adding content

**New technology:** add a row to `data/tech.ts` and its effect to the `stats()` function in `state/stats.ts`.

**New destination:** add a row to `data/planets.ts`, an orbital body to `physics/systems.ts` and, if you like, a background to `scenes/landerBackgrounds.ts`. The map position is set in the `bodyPos` function in `scenes/mapScene.ts`.

**Physics tuning:** `physics/systems.ts` holds everything adjustable: gravitational parameters, capture radii, engine acceleration, the delta-v multiplier and the predictor length.

Test the physics without a browser: `npm run sim` flies ideal transfer orbits to every destination and reports whether they reach the capture circle.

## GitHub Pages

The game works on GitHub Pages as is, because it is just static files and saves go to the browser. The build uses relative paths, so the same build works both at `xxx.github.io` and in a subfolder such as `xxx.github.io/kantama/`.

1. Create a repo on GitHub, for example `kantama`, and push this folder to its `main` branch.
2. In the repo, choose **Settings → Pages → Source: GitHub Actions**.
3. The `.github/workflows/pages.yml` workflow publishes the game on every push. It is served at `https://xxx.github.io/kantama/`.

If you want the game inside an `xxx.github.io` repo specifically, run `npm run build` and copy the contents of `web/dist` into a subfolder of that repo (e.g. `kantama/`).

You can switch cloud save on later by adding `VITE_API_URL` to the repo's Variables. Also add `https://xxx.github.io` to Terraform's `extra_cors_origins` list.

## Cloud save locally (optional)

You need the .NET 8 SDK, Azure Functions Core Tools v4 and Docker.

```bash
docker compose up -d                      # Azurite: blob, queue, table
cd api
cp local.settings.json.example local.settings.json
func start                                # http://localhost:7071/api/health

cd ../web
cp .env.example .env.local                # set VITE_API_URL=/api
npm run dev                               # Vite proxies /api calls to Functions
```

API:

| Call | Action |
| --- | --- |
| `GET /api/saves/{playerId}` | Returns the save, or 404 |
| `PUT /api/saves/{playerId}` | Saves. 409 if the cloud has a newer version (another device) |
| `GET /api/health` | Health check |

The player id is a GUID generated in the browser. For now it is the only key, so add sign-in before anyone outside the family plays.

## To the cloud (when the time comes)

```bash
cd infra
cp terraform.tfvars.example terraform.tfvars   # add subscription_id
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

### What Terraform creates

| Resource | Why | Cost for hobby use |
| --- | --- | --- |
| Static Web App (Free) | The game's HTML/JS/CSS via CDN | €0 |
| Function App (Flex Consumption, .NET 8) | Save API | effectively €0 (free grant) |
| Storage Account | Table: saves. Blob: deployment package + a `replays` container for the future | cents/month |
| Log Analytics + Application Insights | Logs and errors | small, 30-day retention |

Choices:

- **Table Storage vs. Cosmos DB:** a save is one key-value row per player, so Table Storage is enough and the cheapest. Cosmos DB (serverless) is a sensible next step once there are leaderboards or queries.
- **No keys:** shared keys on the Storage Account are disabled. The Function App uses a managed identity (roles at the end of `main.tf`).
- **A separate Function App instead of SWA managed functions:** you get direct control (Flex Consumption, identity, App Insights). The browser calls the API directly; CORS is defined in Terraform.

Note: the Terraform and C# code has not been run or compiled yet. Run `terraform validate` and `dotnet build` first and fix any provider version differences.

## Ideas

- A surface rover, digging and destructible terrain (MineBombers spirit)
- Mission chains: building a Moon base step by step
- Sound and vibration (Web Audio API, `navigator.vibrate`)
- A book of discoveries: collectible planet cards with facts
- PWA (manifest + service worker) so the game installs to the iPhone home screen
- GitHub Actions: build + Terraform plan for pull requests
