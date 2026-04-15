import {
  type RouteConfig,
  index,
  layout,
  prefix,
  route
} from "@react-router/dev/routes";

export default [
  index("./routes/_index.tsx"),
  route("uploads/*", "./routes/uploads.$.tsx"),
  route(".well-known/*", "./routes/well-known.$.tsx"),
  ...prefix("x", [
    layout("./routes/x/layout.tsx", [
      ...prefix("quality", [
        route("ballooning", "./routes/x/quality/ballooning.tsx", [
          route("new", "./routes/x/quality/ballooning.new.tsx")
        ])
      ]),
      ...prefix("ballooning-diagram", [
        route("delete/:id", "./routes/x/ballooning-diagram/delete.$id.tsx"),
        layout("./routes/x/ballooning-diagram/_layout.tsx", [
          route(":id", "./routes/x/ballooning-diagram/$id.tsx"),
          route(":id/save", "./routes/x/ballooning-diagram/$id.save.tsx")
        ])
      ]),
      route("api/upload-pdf", "./routes/x/api.upload-pdf.tsx")
    ])
  ])
] satisfies RouteConfig;
