# 🩸 Digital Blood Donation Network – Backend

This is the backend service for the **Digital Blood Donation Network**, a platform that connects blood donors with hospitals and blood banks in real-time. Built with **NestJS**, it powers features like geolocation-based donor matching, real-time alerts, donation tracking, and administrative tools.

---

## 🚀 Tech Stack

- **Framework**: [NestJS](https://nestjs.com/)
- **Database**: MongoDB (via Mongoose)
- **Authentication**: JWT-based Auth
- **Real-time**: WebSockets or Firebase (TBD)
- **Notifications**: Twilio (SMS) / SendGrid (Email)
- **Geolocation**: Google Maps API
- **Other Tools**: @nestjs/config, @nestjs/mongoose

---

## 📦 Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/yourusername/bloodnet-backend.git
cd bloodnet-backend
```

### 2. Clone the repo
```bash
npm install
```

### 3. Set up environment variables
```bash
PORT=3000
MONGO_URI=mongodb://localhost:27017/bloodnet
JWT_SECRET=yourSuperSecretKey
```

### 4. Start the development server
```bash
npm run start:dev
```

The server runs on **http://localhost:3000/api**.

## 📁 Project Structure
```
src/
│
├── auth/              # Auth & authorization
├── users/             # Shared user base
├── donors/            # Donor-specific logic
├── hospitals/         # Hospital module
├── blood-bank/        # Central blood management
├── requests/          # Urgent blood requests
├── notifications/     # Email/SMS/WebSocket alerts
├── analytics/         # Reports and insights
├── admin/             # Platform admin tools
├── common/            # Shared utils, guards, filters
├── config/            # App & DB config
├── app.module.ts
└── main.ts
```

## 🛡️ Security
+ JWT-based authentication
+ Role-based access control
+ Input validation with DTOs

## 📌 Roadmap
- [x] Auth module with role-based access
- [ ] Donor registration + profile
- [ ] Hospital request management
- [ ] Blood bank inventory + test tracking
- [ ] Real-time notifications
- [ ] Admin dashboard
- [ ] Analytics & reporting

---