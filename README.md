# Zip Link

A scalable URL shortener backend built with [NestJS](https://nestjs.com/), PostgreSQL, and Redis.  
This project was created as a learning journey in system design and backend scalability.

---

## 🚀 What is this?

This is a production-style backend API for shortening long URLs into compact, shareable codes (think `bit.ly` or `tinyurl`).  
More than a simple clone, this project demonstrates modern, real-world backend strategies for scalability, speed, and reliability.

---

## 🎯 Why build it?

Instead of following tutorials or reusing existing templates, this project is a hands-on exploration of how scalable backends are actually engineered:

- Batched/atomic ID allocation
- Cache-first reads and writes
- Async analytics
- Safe, stateless, containerized deployment

If you're curious how real-world systems deliver performance and durability under heavy load, this project is for you.

---

## 🏗️ Architecture Highlights

- **NestJS** as the core web framework (modular, testable, DI support)
- **PostgreSQL** for durable storage of URL mappings and counters
- **Prisma ORM** for type-safe, modern database access
- **Redis** for caching hot URLs and buffering analytics events
- **Two Redis instances**: one for live cache, one for analytics buffer
- **Base62 encoding** for short, URL-friendly codes
- **Batch-wise atomic ID allocation** to minimize DB writes and avoid race conditions
- **Analytics**: Click events are buffered in Redis and flushed to DB periodically (cron job)
- **Rate limiting** for both shortening and redirects to protect against abuse
- **Security**: Strict URL validation, CORS + Helmet, parameterized queries

---

## ⚡ Key Features

- Create short URLs for any valid http(s) link
- Fast redirects (cache-first, fallback to DB)
- No duplicate short codes, even with multiple app instances (thanks to atomic, batched counter updates)
- Click analytics, buffered in Redis for high-throughput recording, periodically flushed to DB
- Health endpoints and robust logging
- Ready for Docker and cloud deployment

---

## 🐳 Docker Setup

We use Docker Compose to run PostgreSQL and **two Redis instances** (one for cache, one for analytics buffer).

1. **Start the infrastructure (Postgres + Redis)**

   ```bash
   docker-compose -f docker-compose.yml up -d
   ```

   This launches:
   - PostgreSQL DB (port 5433)
   - Redis cache (port 6379)
   - Redis for analytics (port 6380)

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Create and configure your environment file**  
   Copy `.env.example` to `.env` and update with your DB/Redis credentials.

4. **Run Prisma migrations & seed the DB**

   ```bash
   npx prisma migrate deploy
   npx prisma db seed
   ```

5. **Start the app**
   ```bash
   npm run start:dev
   # or for production
   npm run build && npm run start:prod
   ```

---

## 🧩 Example API Usage

- **Shorten a URL:**  
  `POST /api/urls/shorten`  
  `{ "originalUrl": "https://example.com" }`

- **Redirect:**  
  `GET /:shortCode`  
  (e.g., `/abc123` redirects to the original URL)

- **Get analytics:**  
  `GET /api/urls/stats/{shortCode}`

- **Delete a short URL:**  
  `DELETE /api/urls/delete/{shortCode}`

- **API Docs:**  
  Interactive Swagger docs available at:
  ```
  http://localhost:3000/api-docs
  ```

---

## 🌐 Live Demo

[Zip Link](https://ziplink-demo.vercel.app)

---

## 📝 License

MIT

---

## 🙋‍♂️ Why use this project?

- Great for learning scalable backend patterns
- Launchpad for your own custom URL shortener
- Modern, well-commented, and open for contributions!

---

Built with ❤️ by [@aakamshpm](https://github.com/aakamshpm)
