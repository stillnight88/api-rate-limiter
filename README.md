# API Rate Limiter

A backend API built with Node.js, Express, Redis, and MongoDB for exploring rate limiting, request throttling, and abuse prevention strategies.

This project was created while learning how modern backend systems control request volume, enforce usage policies, and protect APIs from excessive traffic through layered rate limiting techniques.

---

## Project Context

The primary goal of this project was exploring different approaches to API protection and traffic management.

Rather than focusing on CRUD operations, the project focuses on how backend systems:

* Control request volume
* Enforce usage quotas
* Prevent abuse
* Apply role-based throttling
* Temporarily block repeat offenders
* Scale rate limiting using Redis

The application uses both public and authenticated endpoints to demonstrate different rate limiting strategies.

---

## Features

### Authentication

* User registration
* User login
* JWT-based authentication
* Role-based user access

### Rate Limiting

* Redis-backed rate limiting
* Distributed rate limit storage
* Request quota enforcement
* Retry-after support
* Rate limit response headers

### Dynamic Throttling

Different request quotas based on user role:

```text
Guest   → 50 requests/hour
Basic   → 100 requests/hour
Premium → 1000 requests/hour
Admin   → 10000 requests/hour
```

### Abuse Prevention

* Violation tracking
* Automatic IP blocking
* Temporary user blocking
* Repeated offense detection
* Block expiration handling

### Infrastructure

* Redis integration
* Graceful shutdown handling
* Security middleware
* Response compression

---

## Tech Stack

### Backend

* Node.js
* Express.js

### Database

* MongoDB
* Mongoose

### Authentication

* JSON Web Tokens (JWT)
* bcrypt

### Rate Limiting

* rate-limiter-flexible
* express-rate-limit

### Infrastructure

* Redis
* ioredis

### Security

* Helmet

### Performance

* Compression

---

## Project Structure

```text
config/           Redis configuration
controllers/      Authentication and API handlers
middleware/       Rate limiting, throttling, blocking, and authentication
models/           User schema and role definitions
routes/           Authentication and protected API routes
utils/            Response helpers
app.js            Express application setup
server.js         Server startup and lifecycle management
```

---

## Installation

### Prerequisites

* Node.js
* MongoDB
* Redis

### Clone the Repository

```bash
git clone <repository-url>
cd api-rate-limiter
```

### Install Dependencies

```bash
npm install
```

### Configuration

Copy the example environment file:

```bash
cp .env.example .env
```

Update the values as required for your environment.

Refer to `.env.example` for the complete list of configuration variables.

### Start the Application

Development:

```bash
npm run dev
```

Production:

```bash
npm start
```

---

## Rate Limiting Architecture

The application uses multiple layers of protection.

### Layer 1 — Global API Protection

All API routes pass through a Redis-backed rate limiter.

```text
Client
   ↓
Redis Limiter
   ↓
API Route
```

This provides baseline protection against excessive request volume.

---

### Layer 2 — Role-Based Throttling

Authenticated users receive different quotas depending on their role.

```text
Guest
Basic
Premium
Admin
```

Each role receives its own Redis-backed limiter configuration.

This simulates subscription-tier usage policies commonly found in production APIs.

---

### Layer 3 — Violation Tracking

When rate limits are repeatedly exceeded:

```text
Rate Limit Hit
        ↓
Violation Recorded
        ↓
Violation Counter Increased
        ↓
Temporary Block Applied
```

The system tracks repeated abuse attempts within a configurable time window.

---

### Layer 4 — Temporary Blocking

The application can temporarily block:

* Anonymous IP addresses
* Authenticated users

Block records automatically expire after the configured duration.

---

## API Overview

### Authentication Routes

```http
POST /auth/signup
POST /auth/login
```

### Public Endpoint

```http
GET /api/public
```

Accessible without authentication.

Protected by IP-based abuse prevention.

### Protected Endpoint

```http
GET /api/protected
```

Requires:

* Valid JWT
* User authentication
* Dynamic rate limiting
* Violation checks

---

## Redis Integration

Redis is used as the shared storage layer for rate limiting data.

This allows:

* Persistent counters
* Distributed request tracking
* Consistent limits across application instances

The project demonstrates how Redis can be integrated into API protection systems instead of relying solely on in-memory rate limiting.

---

## Abuse Prevention Strategy

The application combines:

* Request quotas
* Role-based limits
* Violation tracking
* Temporary blocks

to create a layered defense model.

This approach is more resilient than a single fixed request limit.

---

## Limitations

This repository reflects an early learning project and intentionally focuses on rate limiting and traffic-control concepts.

Current limitations include:

* No automated test suite
* No monitoring dashboard
* No analytics reporting
* No distributed block synchronization
* No API documentation (Swagger/OpenAPI)
* No administrative management interface
* Limited production hardening

---

## Repository Status

This repository is preserved as a learning project demonstrating:

* Redis-backed rate limiting
* Role-based throttling
* API abuse prevention
* IP blocking strategies
* JWT authentication
* Traffic-control architecture
* Graceful application shutdown

The project is not actively maintained and primarily serves as a reference for the backend concepts explored during development.
