![Daily Do It - Simple Daily Habit Tracking](https://dailydoit.online/img/og-v1.jpg)

<div align='center'>
  <h1><a href="https://dailydoit.online/">Daily Do It</a></h1>
  <p>Simple daily habit tracking</p>
  <img alt="GitHub" src="https://img.shields.io/github/license/ollieri3/daily-do-it">
</div>

---

## 💻 Tech Stack

Here's a brief high-level overview of the tech stack Daily Do It uses:

- It's a NodeJS with Express server rendered web application
- Using Typescript for both server code and Frontend scripts
- Handlebars template engine for server rendered templates
- PostgreSQL Database for persistent storage
- Tailwind CSS for Frontend Styling

## Database setup

ℹ️ First time setup? run the [setup script](/db/setup.js) once the db is up.

Start: `$ docker compose up db`

Interactive psql: `$ docker compose exec -u postgres -it db psql`

## ℹ️ License

[MIT](LICENSE)
