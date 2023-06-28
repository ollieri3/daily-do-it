import express from "express";
import { engine } from "express-handlebars";
import { fileURLToPath } from "url";
import { getPortPromise as getPort } from "portfinder";

import { notFound } from "./lib/handlers.js";

const port = await getPort();

const app = express();

// Don't tell clients that the server is powered by Express
app.disable("x-powered-by");

app.engine('handlebars', engine({
  defaultLayout: "main"
}));
app.set("view engine", "handlebars");

app.set("views", fileURLToPath( new URL('.', import.meta.url) + 'views'));

// Routes
app.get("/", (_, res) => {
  res.contentType("text/plain");
  res.send("Hello World");
})

app.use(notFound);

app.listen(port, () => console.log(
  `Express started on http://localhost:${port} \n` +
  `Press Ctrl-C to terminate`
));
