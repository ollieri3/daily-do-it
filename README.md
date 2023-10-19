![Daily Do It - Simple Daily Habit Tracking](https://dailydoit.online/img/og-v1.jpg)

<div align='center'>
  <h1><a href="https://dailydoit.online/">Daily Do It</a></h1>
  <p>Simple daily habit tracking</p>
  <img alt="GitHub" src="https://img.shields.io/github/license/ollieri3/daily-do-it">
</div>

---

## 💬 Introduction

This repository contains the source code for the [Daily Do It](https://dailydoit.online/) application. A simple habit tracking tool.

**You can read more about Daily Do It on [the project homepage](https://dailydoit.online/).**

## 🏃 Getting up and running

ℹ️ Make certain you have a compatible version of NodeJS installed, you can reference the `engines` field within the [package.json](package.json) to see the currently targeted version.

1. Make a copy of [.env.example](.env.example), renaming it to `.env`
2. Run `$ npm install` to install the project dependencies
3. Use `$ npm start` to run the development server
4. `$ docker-compose up db` to run the PostgreSQL database

## 💻 Tech Stack

Here's a brief high-level overview of the tech stack Daily Do It uses:

- It's a NodeJS with Express server rendered web application
- Written in Typescript for both the server and client side scripts
- Utilizes the Handlebars template engine for server rendered templates
- PostgreSQL database for persistent storage
- Tailwind CSS for Frontend Styling
- Docker with Docker Compose for local PostgreSQL and Mailhog management.

## ℹ️ License

[MIT](LICENSE)
