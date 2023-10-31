import express from "express";
import { fileURLToPath } from "url";
import { getPortPromise as getPort } from "portfinder";
import passport from "passport";
import dayjs from "dayjs";
import localeData from "dayjs/plugin/localeData.js";
import bodyParser from "body-parser";
import * as Sentry from "@sentry/node";

import { addRoutes } from "./routes.js";
import { notFound, serverError } from "./middleware/error.js";
import { sessionMiddleware } from "./middleware/session.js";
import { configurePassport } from "./helpers/passport-strategies.js";
import {
  helmetMiddleware,
  sitemapMiddleware,
  templateGlobalsMiddleware,
} from "./middleware/general.js";
import {
  provideCSRFTokenMiddleware,
  validateCSRFMiddleware,
} from "./middleware/csrf.js";
import { configureHandlebars } from "./helpers/configure-handlebars.js";
import { configureProxySupport } from "./helpers/proxy.js";
import { configureErrorMonitoring } from "./helpers/configure-error-monitoring.js";

configureErrorMonitoring();

dayjs.extend(localeData);

const app = express();

configureProxySupport(app);
configureHandlebars(app);
configurePassport();

app.use(Sentry.Handlers.requestHandler());
app.use(
  express.static(fileURLToPath(new URL(".", import.meta.url) + "public")),
);
app.use(sessionMiddleware);
app.use(passport.session());
app.use(helmetMiddleware);
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(templateGlobalsMiddleware);
app.use(provideCSRFTokenMiddleware);
app.use(validateCSRFMiddleware);
app.use(sitemapMiddleware);

addRoutes(app);

app.use(notFound);
app.use(Sentry.Handlers.errorHandler());
app.use(serverError);

const port = await getPort();
app.listen(port, () =>
  console.log(
    `Express started on http://localhost:${port}\nPress Ctrl-C to terminate.`,
  ),
);
