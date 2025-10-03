import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
  index("routes/_index.tsx"),
  route("home", "routes/home.tsx"),
  layout("routes/_layout.tsx", [
    route("dashboard", "routes/dashboard/index.tsx"),
    route("historial", "routes/historial/index.tsx"),
    route("historial/:versionId", "routes/historial/$versionId.tsx"),
    route("agente", "routes/agente/index.tsx"),
    layout("routes/campanas/_layout.tsx", [
      route("campanas/difusion", "routes/campanas/difusion/index.tsx"),
      route("campanas/difusion/:campaignNumber", "routes/campanas/difusion/$campaignNumber/index.tsx"),
      route("campanas/difusion/test-db", "routes/campanas/difusion/test-db.tsx"),
      route("campanas/analitica", "routes/campanas/analitica/index.tsx"),
    ]),
    route("modulo2", "routes/modulo2/index.tsx"),
    route("tests", "routes/tests/index.tsx"),
    route("tests/db", "routes/tests/db.tsx"),
    route("tests/agente", "routes/tests/agente.tsx"),
    route("logout", "routes/logout.tsx"),
  ]),
] satisfies RouteConfig;
