import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("form/:id", "routes/form.$id.tsx"),
  route("responses/:formId", "routes/responses.$formId.tsx"),
] satisfies RouteConfig;
