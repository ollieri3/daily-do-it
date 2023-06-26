import express from "express";

const app = express();

// Don't tell clients that the server is powered by Express
app.disable("x-powered-by");

// Routes
app.get("/", (_, res) => {
  res.contentType("text/plain");
  res.send("Hello World");
})

app.listen(3000, () => console.log(
  `Express started on http://localhost:${3000};` +
  `Press Ctrl-C to terminate`
));
