import express from "express";
import { engine } from "express-handlebars";
import { fileURLToPath } from "url";

import * as handlers from "./lib/handlers";

const app = express();

// Don't tell clients that the server is powered by Express
app.disable("x-powered-by");

app.engine('handlebars', engine({
  defaultLayout: "main"
}));
app.set("view engine", "handlebars");
app.set("views", fileURLToPath( new URL('.', import.meta.url) + '/public'));

// Routes
app.get("/", (_, res) => {
  res.contentType("text/plain");
  res.send("Hello World");
})

app.use(handlers.notFound);


app.listen(3000, () => console.log(
  `Express started on http://localhost:${3000};` +
  `Press Ctrl-C to terminate`
));
