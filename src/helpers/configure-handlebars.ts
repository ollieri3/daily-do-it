import type { Application } from "express";
import { engine } from "express-handlebars";
import { fileURLToPath } from "url";

export function configureHandlebars(app: Application) {
  app.engine(
    "handlebars",
    engine({
      defaultLayout: "main",
      helpers: {
        section: function (name: string, options: any) {
          if (!this._sections) this._sections = {};
          (this._sections as any)[name] = options.fn(this);
          return null;
        },
      },
    }),
  );
  app.set("view engine", "handlebars");
  app.set("views", fileURLToPath(new URL("../", import.meta.url) + "views"));
}
