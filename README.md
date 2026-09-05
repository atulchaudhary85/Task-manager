\# Task Manager — Productivity OS



A full-stack productivity and task management web application built to help users organize tasks, track habits, manage deadlines, analyze productivity, and stay focused.



🌐 \*\*Live App:\*\* https://task-manager-dsz.pages.dev  

⚙️ \*\*Backend API:\*\* https://task-manager-api-hhtr.onrender.com  

💻 \*\*GitHub Repository:\*\* https://github.com/atulchaudhary85/Task-manager



\---



\## ✨ Features



\### 🔐 Authentication

\- User registration

\- Email OTP verification

\- Secure email/password login

\- Forgot password with email OTP

\- Password reset

\- JWT-based authentication

\- Password hashing with bcrypt



\### ✅ Task Management

\- Create tasks

\- Edit tasks

\- Delete tasks

\- Task descriptions

\- Planned dates

\- Deadlines

\- Priority levels

\- Categories

\- Tags

\- Estimated time

\- Progress tracking

\- Subtasks

\- Notes



\### 📊 Task Status



Tasks can be organized into:



\- To Do

\- In Progress

\- Completed

\- Missed



Task status and progress are stored permanently in the database.



\### 📅 Planning

\- Today view

\- All Tasks

\- Weekly planner

\- Calendar

\- Upcoming tasks

\- Overdue tasks

\- Completed tasks



\### 🔁 Recurring Tasks

Support for recurring tasks with automatic occurrence generation.



\### 🔔 Reminders

\- Task reminders

\- Reminder notifications

\- Snooze functionality



\### 🧠 Focus Mode

Dedicated focus functionality for working on selected tasks.



\### 📈 Analytics

Productivity analytics including task completion and progress information.



\### 🎯 Habit Tracker

\- Create habits

\- Track daily habits

\- Mark habits complete

\- Persistent habit history



\### 📦 Archive

Completed or unnecessary tasks can be archived and restored later.



\### ⚙️ Settings

\- Update profile information

\- Change password

\- Light mode

\- Dark mode

\- Persistent theme preferences



\### 📱 Responsive Design

Responsive interface designed for desktop and mobile devices.



\---



\## 🛠️ Tech Stack



\### Frontend

\- React

\- Vite

\- React Router

\- JavaScript

\- CSS



\### Backend

\- Node.js

\- Express.js

\- REST API

\- JWT

\- bcrypt

\- Helmet

\- Express Rate Limit



\### Database

\- MongoDB

\- MongoDB Atlas

\- Mongoose



\### Email

\- Brevo Transactional Email API



\### Deployment

\- Cloudflare Pages — Frontend

\- Render — Backend

\- MongoDB Atlas — Database



\### Version Control

\- Git

\- GitHub



\---



\## 🏗️ Architecture



```text

User

&#x20; │

&#x20; ▼

React + Vite Frontend

Cloudflare Pages

&#x20; │

&#x20; │ REST API

&#x20; ▼

Node.js + Express Backend

Render

&#x20; │

&#x20; ├────► Brevo Email API

&#x20; │

&#x20; ▼

MongoDB Atlas

```



\---



\## 🔒 Security



The application includes:



\- JWT authentication

\- bcrypt password hashing

\- Protected API routes

\- Environment variables for secrets

\- Helmet security headers

\- API rate limiting

\- CORS configuration

\- OTP expiration

\- OTP attempt limits

\- Cryptographically generated OTP codes



Sensitive credentials are not committed to the repository.



\---



\## 📂 Project Structure



```text

task-manager/

│

├── client/

│   ├── src/

│   │   ├── components/

│   │   ├── pages/

│   │   ├── config.js

│   │   └── ...

│   │

│   └── package.json

│

├── middleware/

├── models/

├── routes/

├── utils/

├── server.js

├── package.json

└── README.md

```



\---



\## 🚀 Running Locally



\### 1. Clone the repository



```bash

git clone https://github.com/atulchaudhary85/Task-manager.git

cd Task-manager

```



\### 2. Install backend dependencies



```bash

npm install

```



\### 3. Install frontend dependencies



```bash

cd client

npm install

```



\### 4. Configure environment variables



Create a `.env` file in the project root.



Required environment variables:



```env

PORT=5000

MONGO\_URI=your\_mongodb\_connection\_string

JWT\_SECRET=your\_jwt\_secret

BREVO\_API\_KEY=your\_brevo\_api\_key

EMAIL\_USER=your\_verified\_sender\_email

CLIENT\_URL=http://localhost:5173

```



Never commit the `.env` file.



\### 5. Start the backend



From the project root:



```bash

node server.js

```



Backend runs at:



```text

http://localhost:5000

```



\### 6. Start the frontend



From the `client` directory:



```bash

npm run dev

```



Frontend runs at:



```text

http://localhost:5173

```



\---



\## 🌐 Production



The application is publicly deployed using separate frontend, backend, database, and transactional email services.



\*\*Frontend\*\*  

Cloudflare Pages



\*\*Backend\*\*  

Render



\*\*Database\*\*  

MongoDB Atlas



\*\*Transactional Email\*\*  

Brevo API



\---



\## 👨‍💻 Developer



\*\*Atul Chaudhary\*\*



Full-Stack Web Development Project



GitHub: https://github.com/atulchaudhary85



\---



\## 📌 Project Status



✅ Authentication  

✅ Email OTP verification  

✅ Task CRUD  

✅ Task persistence  

✅ Task status management  

✅ Habit tracking  

✅ Recurring tasks  

✅ Reminders  

✅ Focus mode  

✅ Analytics  

✅ Archive \& restore  

✅ Profile settings  

✅ Dark/light theme  

✅ Responsive UI  

✅ MongoDB Atlas production database  

✅ Production email API  

✅ Public frontend deployment  

✅ Public backend deployment



\---



⭐ If you find this project useful, consider giving the repository a star.

