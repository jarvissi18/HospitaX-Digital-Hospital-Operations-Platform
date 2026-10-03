<div align="center">

# 🏥 HospitaX

### Digital Hospital Operations Platform

**A modern, role-aware hospital operations platform combining clinical workflows, workforce operations, hospital infrastructure, analytics, and controlled AI-assisted actions.**

<br />

[![React](https://img.shields.io/badge/React-TypeScript-61DAFB?style=for-the-badge\&logo=react\&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-Frontend-646CFF?style=for-the-badge\&logo=vite\&logoColor=white)](https://vite.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-UI-06B6D4?style=for-the-badge\&logo=tailwindcss\&logoColor=white)](https://tailwindcss.com/)
[![Python](https://img.shields.io/badge/Python-Backend-3776AB?style=for-the-badge\&logo=python\&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-REST_API-009688?style=for-the-badge\&logo=fastapi\&logoColor=white)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-4169E1?style=for-the-badge\&logo=postgresql\&logoColor=white)](https://www.postgresql.org/)
[![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-ORM-D71F00?style=for-the-badge)](https://www.sqlalchemy.org/)
[![JWT](https://img.shields.io/badge/JWT-Authentication-000000?style=for-the-badge\&logo=jsonwebtokens\&logoColor=white)](https://jwt.io/)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-AI-8E75B2?style=for-the-badge\&logo=google\&logoColor=white)](https://ai.google.dev/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](./LICENSE)

<br />

[![GitHub](https://img.shields.io/badge/Repository-HospitaX-181717?style=for-the-badge\&logo=github)](https://github.com/jarvissi18/HospitaX-Digital-Hospital-Operations-Platform)

<br />

**Clinical Operations • Workforce Management • Hospital Infrastructure • Analytics • AI Operations**

</div>

---

# ✦ Overview

**HospitaX** is a full-stack **Digital Hospital Operations Platform** designed to bring hospital administration, clinical workflows, workforce management, infrastructure, analytics, and AI-assisted operations into a unified system.

The platform is built around a **role-aware architecture**, where the authenticated user's identity, role, permissions, and operational scope influence what they can see and what actions they can perform.

HospitaX goes beyond a traditional hospital CRUD application.

It connects:

```text
Users
   ↓
Authentication
   ↓
Role & Permissions
   ↓
Hospital Operations
   ↓
Clinical Workflows
   ↓
Workforce Management
   ↓
Analytics
   ↓
AI Operations Assistant
   ↓
Controlled Application Actions
```

The result is a single operational workspace for different hospital roles, supported by a backend API layer, relational database, and AI orchestration layer.

---

# 🎯 Product Vision

HospitaX is built around one core idea:

> **Make complex hospital operations easier to access, understand, and execute through a secure, role-aware digital platform.**

Instead of treating AI as an isolated chatbot, HospitaX connects AI to the application's existing operational capabilities.

```text
                         HOSPITAX
                            │
                            ▼
                    Authenticated User
                            │
                            ▼
                    Identity + Role
                            │
            ┌───────────────┼───────────────┐
            │               │               │
            ▼               ▼               ▼
        Dashboard       Operations          AI
            │               │               │
            └───────────────┼───────────────┘
                            │
                            ▼
                  Hospital Operations Layer
```

---

# 👥 Role-Aware Platform

HospitaX provides role-specific experiences for:

| Role                    | Operational Focus                              |
| ----------------------- | ---------------------------------------------- |
| 👨‍💼 **Administrator** | Workforce, assignments, monitoring, operations |
| 👨‍⚕️ **Doctor**        | Clinical and patient workflows                 |
| 👩‍⚕️ **Nurse**         | Patient care and operational workflows         |
| 🧑‍💻 **Receptionist**  | Patient-facing and administrative operations   |
| 🧹 **Housekeeper**      | Assigned operational and housekeeping work     |

The platform uses the authenticated user's role to determine the appropriate dashboard, navigation, operational scope, and permissions.

---

# ✨ Platform Capabilities

## 🔐 Authentication & Authorization

* JWT-based authentication
* Secure login
* Password protection
* Protected application routes
* Authenticated API requests
* Role identification
* Role-based access control
* Permission-aware operations
* User-specific operational scope
* Session handling

---

## 🕐 Attendance Management

HospitaX supports staff attendance workflows from check-in through check-out.

```text
Login
  │
  ▼
Check-In
  │
  ▼
Attendance
  │
  ▼
Hospital Operations
  │
  ▼
Check-Out
```

Capabilities include:

* Check-in
* Check-out
* Attendance status
* Attendance history
* Role-aware attendance access
* Attendance visibility for authorized users

---

# 📋 Workforce & Work Management

HospitaX provides an operational task-management workflow between administrators and staff.

## Administrator Workflow

Administrators can:

* Create work
* Assign staff
* Select priority
* Set due date
* Set due time
* Define location
* Add instructions
* Monitor task progress

## Assigned Staff Workflow

```text
My Work
   │
   ├── Pending
   │
   ├── In Progress
   │
   └── Completed
```

## Work Lifecycle

```text
Administrator
      │
      ▼
Create Work
      │
      ▼
Assign Staff
      │
      ▼
Staff Work Queue
      │
      ▼
Pending
      │
      ▼
In Progress
      │
      ▼
Completed
      │
      ▼
Administrator Monitoring
```

This creates a complete operational feedback loop between task creation, execution, and monitoring.

---

# 🤖 AI Operations Assistant

The **AI Operations Assistant** is one of the core architectural capabilities of HospitaX.

It is designed as a **role-aware operational interface**, rather than a standalone conversational chatbot.

Users can interact through:

* 💬 Text prompts
* 🎙️ Voice input

The AI layer can understand operational requests, identify the user's context, determine the intended action, validate permissions, interact with application tools, and return structured results.

---

# 🧠 AI Architecture

```text
                         HOSPITAX
                            │
                            ▼
                    Logged-in User
                            │
                            ▼
                 AI Operations Assistant
                       /           \
                      /             \
               Text Prompt         Voice
                      \             /
                       \           /
                        ─── STT ───
                            │
                            ▼
                    AI Orchestrator
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                 │
          ▼                 ▼                 ▼
      Identity           Intent          Permissions
       / Role          + Entities          / Scope
          │                 │                 │
          └─────────────────┼─────────────────┘
                            │
                            ▼
                    Tool / Action Layer
                            │
             ┌──────────────┼──────────────┐
             │              │              │
            READ           WRITE          UPDATE
             │              │              │
       View / List      Create / Assign   Modify / Reassign
             │              │              │
             └──────────────┼──────────────┘
                            │
                            ▼
                    Existing APIs / DB
                            │
                            ▼
                    Structured Result
                            │
                            ▼
                       AI Response
```

### Architectural principle

The AI layer is connected to the **application's existing APIs and business workflows** instead of being given unrestricted direct database access.

```text
AI
 ↓
Tool / Action Layer
 ↓
Existing API Layer
 ↓
Business Logic
 ↓
Database
```

This keeps operational logic centralized.

---

# 🔄 AI Request Lifecycle

A typical AI request flows through the following stages:

```text
User Request
     │
     ▼
Input Processing
     │
     ├───────────────┐
     │               │
   Text             Voice
     │               │
     │              STT
     │               │
     └───────┬───────┘
             ▼
       AI Orchestrator
             │
             ▼
       Identity / Role
             │
             ▼
      Intent + Entities
             │
             ▼
    Permissions / Scope
             │
             ▼
       Tool Selection
             │
             ▼
      Existing API Layer
             │
             ▼
       Database / Service
             │
             ▼
       Structured Result
             │
             ▼
        AI Response
```

---

# 🔒 Permission-Aware AI

HospitaX does not treat AI as an unrestricted administrative interface.

AI-assisted actions are evaluated using:

```text
User Identity
      +
Role
      +
Intent
      +
Entities
      +
Permissions
      +
Operational Scope
      ↓
Allowed Action
```

This allows the system to distinguish between:

* What the user requested
* Who is making the request
* Which role the user has
* Which module is involved
* Which operation is being requested
* Whether the operation is permitted
* What operational scope applies

---

# 🧰 AI Tool / Action Layer

The AI assistant communicates with application capabilities through a controlled action layer.

## READ

Examples:

* View
* Search
* List
* Retrieve
* Summarize
* Explain
* Query operational information

## WRITE

Controlled operations such as:

* Create
* Add
* Register
* Assign
* Schedule

## UPDATE

Controlled operations such as:

* Modify
* Update
* Reassign
* Change status

## DELETE / CANCEL

Available only where the corresponding module supports the operation under its permission rules.

```text
                   AI Assistant
                         │
                         ▼
                  Action Layer
                         │
            ┌────────────┼────────────┐
            ▼            ▼            ▼
           READ         WRITE       UPDATE
            │            │            │
            └────────────┼────────────┘
                         │
                         ▼
                  Existing APIs
                         │
                         ▼
                    PostgreSQL
```

---

# 🏥 Implemented Operational Modules

| Module                     | View |   Create   |   Update   | Delete / Cancel | AI Capabilities     |
| -------------------------- | :--: | :--------: | :--------: | :-------------: | ------------------- |
| 👤 **Patients**            |   ✅  |      ✅     |      ✅     |    Controlled   | Search / Summarize  |
| 🩺 **Clinical Encounters** |   ✅  |      ✅     |      ✅     |    Controlled   | Summarize           |
| 💊 **Prescriptions**       |   ✅  |      ✅     |      ✅     |    Controlled   | View / Summarize    |
| 🧪 **Laboratory**          |   ✅  |      ✅     |      ✅     |    Controlled   | Summarize           |
| 🔗 **Referrals**           |   ✅  |      ✅     |      ✅     |    Controlled   | Manage              |
| 🚑 **Transfers**           |   ✅  |      ✅     |      ✅     |    Controlled   | Manage              |
| 🏁 **Discharge**           |   ✅  |      ✅     | Controlled |    Controlled   | Summarize / Manage  |
| 📅 **Follow-ups**          |   ✅  |      ✅     |      ✅     |    Controlled   | Schedule / Update   |
| 📋 **Work**                |   ✅  |      ✅     |      ✅     |        ✅        | Assign / Monitor    |
| 🕐 **Attendance**          |   ✅  | Controlled | Controlled |        —        | View / Summarize    |
| 📊 **Analytics**           |   ✅  |      —     |      —     |        —        | Explain / Summarize |

> **Controlled** means the operation is governed by module-specific permissions and business rules rather than being exposed as unrestricted CRUD.

---

# 👤 Patient Operations

The patient module provides the foundation for patient-related hospital workflows.

Capabilities include:

* Patient registration
* Patient search
* Patient viewing
* Patient updates
* Patient information retrieval
* AI-assisted patient search
* AI-assisted patient summarization

---

# 🩺 Clinical Encounters

Clinical Encounters connect patients with structured clinical workflow information.

Capabilities include:

* Create encounters
* View encounters
* Update encounters
* Retrieve encounter information
* AI-assisted clinical summarization

---

# 💊 Prescription Management

Prescription workflows provide structured medication-related operations.

Capabilities include:

* Create prescriptions
* View prescriptions
* Update prescriptions
* Retrieve prescription information
* AI-assisted prescription summarization

---

# 🧪 Laboratory Operations

Laboratory operations provide structured access to laboratory workflows and records.

Capabilities include:

* Create laboratory records
* View laboratory information
* Update laboratory information
* Retrieve results
* AI-assisted laboratory summarization

---

# 🔗 Referral Management

Referral workflows support operational coordination involving referrals.

Capabilities include:

* Create referrals
* View referrals
* Update referrals
* Manage referral workflows
* AI-assisted referral operations

---

# 🚑 Transfer Management

Transfer workflows support movement of patients across hospital locations or operational contexts.

```text
Patient
   │
   ▼
Current Location
   │
   ▼
Transfer Request
   │
   ▼
Destination
   │
   ▼
Controlled Transfer
```

Capabilities include:

* Create transfers
* View transfers
* Update transfers
* Manage transfer workflows
* AI-assisted transfer operations

---

# 🏁 Discharge Management

Discharge workflows support controlled patient discharge operations.

Capabilities include:

* View discharge information
* Create discharge records
* Controlled updates
* Controlled cancellation
* AI-assisted discharge management
* AI-assisted discharge summarization

---

# 📅 Follow-Up Management

Follow-up workflows support continued operational coordination after clinical events.

Capabilities include:

* Create follow-ups
* View follow-ups
* Update follow-ups
* Schedule follow-ups
* AI-assisted scheduling
* AI-assisted updates

---

# 📊 Analytics & Operational Intelligence

HospitaX includes an analytics layer for operational visibility.

The AI assistant can work with analytics information to:

* Explain metrics
* Summarize operational data
* Answer operational questions
* Convert structured information into understandable responses

```text
Operational Data
      │
      ▼
Structured Analytics
      │
      ▼
AI Interpretation
      │
      ▼
Human-readable Insight
```

---

# 🏥 Hospital Structure

HospitaX models hospital infrastructure using a hierarchical structure.

```text
Hospital
   │
   ├── Departments
   │       │
   │       └── Floors
   │              │
   │              └── Wards
   │                     │
   │                     └── Rooms
   │                            │
   │                            └── Beds
```

This allows operational records to reference meaningful physical hospital locations.

---

# 🔐 Role-Based Access Control

The platform applies authorization across both traditional application workflows and AI-assisted actions.

```text
                 Authenticated User
                         │
                         ▼
                       Role
                         │
              ┌──────────┼──────────┐
              │          │          │
              ▼          ▼          ▼
          Identity   Permissions   Scope
              │          │          │
              └──────────┼──────────┘
                         ▼
                 Allowed Operations
                         │
                         ▼
                    Application
```

---

# 🏗️ System Architecture

```text
┌──────────────────────────────────────────────────────────────┐
│                         HOSPITAX UI                          │
│                                                              │
│        React + TypeScript + Vite + Tailwind CSS              │
│                                                              │
│ Dashboards │ Patients │ Clinical │ Work │ Analytics │ AI     │
└──────────────────────────────┬───────────────────────────────┘
                               │
                               │ REST / HTTP
                               ▼
┌──────────────────────────────────────────────────────────────┐
│                      FASTAPI BACKEND                         │
│                                                              │
│ Auth │ RBAC │ Validation │ Business Logic │ API Routers      │
│                                                              │
│ Patients │ Clinical │ Prescriptions │ Laboratory             │
│ Referrals │ Transfers │ Discharge │ Follow-ups               │
│ Work │ Attendance │ Analytics │ AI Operations                │
└──────────────────────┬───────────────────────┬───────────────┘
                       │                       │
                       ▼                       ▼
              ┌─────────────────┐     ┌─────────────────────┐
              │ AI Orchestrator │     │    SQLAlchemy ORM   │
              │                 │     │                     │
              │ Identity        │     │ Models              │
              │ Intent          │     │ Relationships       │
              │ Entities        │     │ Queries             │
              │ Permissions     │     │ Persistence          │
              │ Tool Selection  │     │                     │
              └────────┬────────┘     └──────────┬──────────┘
                       │                         │
                       ▼                         ▼
                Tool / Action Layer       ┌──────────────┐
                                          │ PostgreSQL   │
                                          └──────────────┘
```

---

# 🔄 End-to-End Platform Flow

```text
                         ┌───────────────┐
                         │     Login     │
                         └───────┬───────┘
                                 │
                                 ▼
                         ┌───────────────┐
                         │ Authentication│
                         └───────┬───────┘
                                 │
                                 ▼
                         ┌───────────────┐
                         │ Role Identify │
                         └───────┬───────┘
                                 │
                                 ▼
                         ┌───────────────┐
                         │  Attendance   │
                         └───────┬───────┘
                                 │
                                 ▼
                         ┌───────────────┐
                         │ Role Dashboard│
                         └───────┬───────┘
                                 │
                 ┌───────────────┼────────────────┐
                 │               │                │
                 ▼               ▼                ▼
             Operations       Clinical           AI
                 │               │                │
                 └───────────────┼────────────────┘
                                 │
                                 ▼
                        Application APIs
                                 │
                                 ▼
                            PostgreSQL
```

---

# 🛠️ Technology Stack

## Frontend

| Technology         | Purpose                              |
| ------------------ | ------------------------------------ |
| **React**          | Component-based user interface       |
| **TypeScript**     | Type-safe development                |
| **Vite**           | Development server and build tooling |
| **Tailwind CSS**   | Utility-first styling                |
| **React Router**   | Client-side routing                  |
| **Axios**          | HTTP/API communication               |
| **Lucide React**   | Interface icons                      |
| **React Toastify** | User feedback and notifications      |

The current repository's frontend package includes the development, build, lint, and preview scripts used by the project.

---

## Backend

| Technology           | Purpose                     |
| -------------------- | --------------------------- |
| **Python**           | Backend runtime             |
| **FastAPI**          | REST API framework          |
| **SQLAlchemy**       | ORM and database access     |
| **Pydantic**         | Data validation and schemas |
| **JWT**              | Authentication              |
| **Passlib / bcrypt** | Password hashing            |
| **Uvicorn**          | ASGI application server     |

---

## Database

### PostgreSQL

PostgreSQL provides persistent relational storage for:

* Users
* Patients
* Clinical operations
* Workforce operations
* Attendance
* Hospital structure
* Operational records
* Application data

---

## AI

### Google Gemini

The AI layer uses Google Gemini as part of the AI Operations capability.

AI responsibilities include:

* Natural-language interaction
* Intent understanding
* Entity processing
* Operational reasoning
* Structured response generation
* AI-assisted application actions

---

# 📁 Repository Structure

The current repository is organized around separate backend, frontend, and documentation areas.

```text
HospitaX-Digital-Hospital-Operations-Platform/
│
├── backend/
│   ├── app/
│   │   ├── ai/
│   │   ├── auth/
│   │   ├── routers/
│   │   ├── ...
│   │   └── main.py
│   │
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── layouts/
│   │   ├── pages/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── types/
│   │   ├── App.tsx
│   │   └── main.tsx
│   │
│   ├── package.json
│   └── vite.config.ts
│
├── docs/
│
├── .env.example
├── .gitignore
├── LICENSE
└── README.md
```

---

# 🔌 API Architecture

The backend follows a modular FastAPI architecture.

```text
FastAPI
│
├── Authentication
├── Staff
├── Attendance
├── Dashboard
├── Patients
├── Clinical Encounters
├── Prescriptions
├── Laboratory
├── Referrals
├── Transfers
├── Discharge
├── Follow-ups
├── Work
├── Analytics
├── Hospital Structure
└── AI Operations
```

Each domain can maintain its own validation, business rules, persistence logic, and API endpoints while sharing common infrastructure.

---

# 🗄️ Data Architecture

HospitaX uses relational data modeling to connect operational entities.

```text
User
 │
 ├── Role
 ├── Attendance
 └── Work Assignments


Patient
 │
 ├── Clinical Encounters
 ├── Prescriptions
 ├── Laboratory
 ├── Referrals
 ├── Transfers
 ├── Discharge
 └── Follow-ups


Hospital Structure
 │
 ├── Department
 ├── Floor
 ├── Ward
 ├── Room
 └── Bed
```

---

# 🔒 Security Architecture

Security is applied across the application and API layers.

### Authentication

JWT access tokens are used for authenticated sessions.

### Password Security

Passwords are protected using bcrypt-based hashing.

### Authorization

Role-based access controls determine which users can access protected functionality.

### Protected Routes

Frontend routes and backend endpoints are protected according to authentication and authorization requirements.

### AI Authorization

AI actions are evaluated against:

```text
Identity
+
Role
+
Intent
+
Permission
+
Scope
```

before an operational action is executed.

### Environment Security

Secrets and environment-specific configuration belong in environment variables.

**Never commit real credentials, database passwords, or API keys to GitHub.**

---

# 🎨 UI / UX Philosophy

HospitaX follows an enterprise-oriented interface philosophy:

* Role-specific dashboards
* Clear information hierarchy
* Consistent navigation
* Responsive layouts
* Reusable components
* Status-driven workflows
* Contextual actions
* Structured data presentation
* Minimal visual clutter
* Operationally focused interfaces

The goal is not simply to display data, but to make hospital workflows easier to execute.

---

# 📸 Screenshots

Project screenshots are maintained under the repository's `docs/` directory and showcase the major operational modules and workflows of HospitaX.

## 🔐 Login

![HospitaX Login](./docs/staffs-login.png)

## 📊 Administrator Dashboard

![HospitaX Administrator Dashboard](./docs/admin-dashboard.png)

## 🤖 AI Operations Assistant

![HospitaX AI Operations Assistant](./docs/ai-assistant.png)

## 👥 Role-Based Dashboards

### 👨‍⚕️ Doctor Dashboard

![HospitaX Doctor Dashboard](./docs/doctor-dashboard.png)

### 👩‍⚕️ Nurse Dashboard

![HospitaX Nurse Dashboard](./docs/nurse-dashboard.png)

### 🧑‍💼 Receptionist Dashboard

![HospitaX Receptionist Dashboard](./docs/receptionist-dashboard.png)

### 🧹 Housekeeper Dashboard

![HospitaX Housekeeper Dashboard](./docs/housekeeper-dashboard.png)

## 📋 Work Management

![HospitaX Work Management](./docs/work-management.png)

## 🏥 Patient Management

![HospitaX Patient Management](./docs/patients.png)

## ➕ Add Patient

![HospitaX Add Patient](./docs/add-patient.png)

## 📅 Appointments

![HospitaX Appointments](./docs/appointments.png)

## 💊 Prescriptions

![HospitaX Prescriptions](./docs/prescriptions.png)

## 🧪 Laboratory

![HospitaX Laboratory](./docs/laboratory.png)

## 🔗 Referrals

![HospitaX Referrals](./docs/referrals.png)

## 🔄 Patient Transfers

![HospitaX Transfers](./docs/transfers.png)

## 🏁 Discharge

![HospitaX Discharge](./docs/discharge.png)

## 📅 Follow-ups

![HospitaX Follow-ups](./docs/follow-ups.png)

## 🕒 Staff Attendance

![HospitaX Staff Attendance](./docs/staff-attendance.png)

## 👨‍💼 Staff Management

![HospitaX Staff Management](./docs/staffs.png)

## 👤 Staff Profile

![HospitaX Staff Profile](./docs/staff-profile.png)

## 🏢 Hospital Structure

### Departments

![HospitaX Departments](./docs/hospital-structure-departments.png)

### Floors

![HospitaX Floors](./docs/hospital-structure-floors.png)

### Wards

![HospitaX Wards](./docs/hospital-structure-wards.png)

### Rooms

![HospitaX Rooms](./docs/hospital-structure-rooms.png)

### Beds

![HospitaX Beds](./docs/hospital-structure-beds.png)
---

# ⚙️ Getting Started

## Prerequisites

Install:

```text
Git
Node.js
npm
Python 3.x
PostgreSQL
```

---

# 1. Clone the Repository

```bash
git clone https://github.com/jarvissi18/HospitaX-Digital-Hospital-Operations-Platform.git
cd HospitaX-Digital-Hospital-Operations-Platform
```

Repository:

```text
https://github.com/jarvissi18/HospitaX-Digital-Hospital-Operations-Platform
```

---

# 2. Configure Environment Variables

The repository contains an `.env.example` template.

Create your local environment file from the template.

### Windows PowerShell

```powershell
Copy-Item .env.example .env
```

### Windows CMD

```cmd
copy .env.example .env
```

### macOS / Linux

```bash
cp .env.example .env
```

Configure the required values according to your local environment.

Example:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/hospitax

JWT_SECRET_KEY=your_jwt_secret

SECRET_KEY=your_application_secret

GEMINI_API_KEY=your_gemini_api_key

CORS_ORIGINS=http://localhost:5173

VITE_API_URL=http://localhost:8000
```

> Keep real credentials only in local environment files. Never commit secrets to the repository.

---

# 3. PostgreSQL Setup

Create a PostgreSQL database:

```sql
CREATE DATABASE hospitax;
```

Example local connection string:

```text
postgresql://postgres:YOUR_PASSWORD@localhost:5432/hospitax
```

Update `DATABASE_URL` in your environment configuration.

---

# 4. Backend Setup

Open a terminal:

```bash
cd backend
```

Create a virtual environment.

### Windows

```bash
python -m venv .venv
```

Activate:

```bash
.venv\Scripts\activate
```

### macOS / Linux

```bash
python3 -m venv .venv
source .venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

---

# 5. Start the Backend

From the `backend` directory:

```bash
uvicorn app.main:app --reload
```

Backend:

```text
http://127.0.0.1:8000
```

Swagger:

```text
http://127.0.0.1:8000/docs
```

ReDoc:

```text
http://127.0.0.1:8000/redoc
```

---

# 6. Frontend Setup

Open a second terminal.

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Create:

```text
frontend/.env
```

Configure:

```env
VITE_API_URL=http://127.0.0.1:8000
```

---

# 7. Start the Frontend

```bash
npm run dev
```

Frontend:

```text
http://localhost:5173
```

---

# 🧪 Frontend Commands

The repository currently defines the following frontend commands:

### Development

```bash
npm run dev
```

### Production Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

### Lint

```bash
npm run lint
```

---

# 🚀 Run the Complete Application

Use two terminals.

### Terminal 1 — Backend

```bash
cd HospitaX-Digital-Hospital-Operations-Platform/backend

python -m venv .venv
```

Windows:

```bash
.venv\Scripts\activate
```

Install:

```bash
pip install -r requirements.txt
```

Run:

```bash
uvicorn app.main:app --reload
```

### Terminal 2 — Frontend

```bash
cd HospitaX-Digital-Hospital-Operations-Platform/frontend

npm install
npm run dev
```

---

# 🌐 Local Development URLs

| Service      | URL                           |
| ------------ | ----------------------------- |
| 🖥️ Frontend | `http://localhost:5173`       |
| ⚡ Backend    | `http://127.0.0.1:8000`       |
| 📖 Swagger   | `http://127.0.0.1:8000/docs`  |
| 📚 ReDoc     | `http://127.0.0.1:8000/redoc` |

---

# 🧪 Testing & Validation

HospitaX should be validated across multiple application layers.

## Authentication

* Valid login
* Invalid credentials
* JWT generation
* Protected routes
* Session persistence
* Logout

## Authorization

* Role identification
* Role-specific dashboard access
* Protected operations
* Permission enforcement

## Patient Operations

* Create patient
* View patient
* Search patient
* Update patient
* AI-assisted retrieval
* AI summarization

## Clinical Operations

* Clinical encounters
* Prescriptions
* Laboratory
* Referrals
* Transfers
* Discharge
* Follow-ups

## Workforce

* Check-in
* Check-out
* Work creation
* Assignment
* Priority
* Due dates
* Status updates
* Monitoring

## AI Operations

* Text input
* Voice input
* Speech-to-text
* Intent processing
* Entity processing
* Permission validation
* Tool selection
* API execution
* Structured results
* AI response generation

---

# 🧠 Engineering Highlights

HospitaX demonstrates engineering across several layers.

### Frontend Engineering

* React component architecture
* TypeScript
* Vite
* Tailwind CSS
* Client-side routing
* Centralized authentication state
* API services
* Reusable UI components
* Role-aware interfaces

### Backend Engineering

* FastAPI
* REST API design
* JWT authentication
* Role-based authorization
* Dependency injection
* Pydantic validation
* SQLAlchemy ORM
* Modular routers
* Domain-oriented backend structure

### Database Engineering

* PostgreSQL
* Relational data modeling
* Entity relationships
* Hospital hierarchy
* Operational persistence

### AI Engineering

* AI orchestration
* Role-aware interaction
* Intent understanding
* Entity extraction
* Permission-aware actions
* Tool/action architecture
* Existing API integration
* Structured result processing
* Voice input integration

---

# 💡 Key Architectural Decisions

## 01 — API-First AI

AI does not need an independent implementation of every business operation.

Instead:

```text
AI
 ↓
Action / Tool Layer
 ↓
Existing API
 ↓
Business Logic
 ↓
Database
```

This keeps business rules centralized.

---

## 02 — Permission-Aware AI

The AI layer operates within the same authorization model as the application.

```text
User
 ↓
Role
 ↓
Permission
 ↓
Scope
 ↓
Allowed Tool
 ↓
API
```

---

## 03 — Modular Domain Design

Hospital operations are separated into logical domains:

```text
Patients
Clinical
Prescriptions
Laboratory
Referrals
Transfers
Discharge
Follow-ups
Work
Attendance
Analytics
```

This makes the system easier to maintain and extend.

---

## 04 — Human-Centered AI

The AI assistant is designed to improve interaction with existing hospital operations.

```text
Human
  ↓
Natural Language
  ↓
AI Orchestrator
  ↓
Controlled Action
  ↓
Application API
  ↓
Structured Result
  ↓
Human
```

---

# 🚀 Deployment Architecture

A production deployment can separate the frontend, backend, database, and AI dependencies.

```text
                         INTERNET
                            │
                            ▼
                  ┌──────────────────┐
                  │     Frontend     │
                  │ React + Vite     │
                  └────────┬─────────┘
                           │
                          HTTPS
                           │
                           ▼
                  ┌──────────────────┐
                  │     FastAPI      │
                  │     Backend      │
                  └────────┬─────────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
        AI Services     SQLAlchemy    Auth/RBAC
                            │
                            ▼
                     ┌─────────────┐
                     │ PostgreSQL  │
                     └─────────────┘
```

---

# 📈 Scalability Direction

The architecture provides room for future expansion.

Potential extensions include:

```text
HospitaX
│
├── Advanced Notifications
├── Real-Time Events
├── Audit & Compliance
├── Advanced Reporting
├── Operational Automation
├── Expanded AI Tools
├── Enterprise Integrations
└── Advanced Operational Intelligence
```

These represent future extension areas rather than claims about currently implemented functionality.

---

# 🗺️ Implementation Scope

## ✅ Core Platform

* Authentication
* JWT security
* Role-based access
* Administrator workflows
* Doctor workflows
* Nurse workflows
* Receptionist workflows
* Housekeeper workflows
* Role-specific dashboards
* Attendance
* Check-in / Check-out
* Work management

## ✅ Clinical & Patient Operations

* Patient management
* Clinical encounters
* Prescriptions
* Laboratory
* Referrals
* Transfers
* Discharge
* Follow-ups

## ✅ Infrastructure & Analytics

* Hospital structure
* Departments
* Floors
* Wards
* Rooms
* Beds
* Analytics

## ✅ AI Operations

* AI Operations Assistant
* Text interaction
* Voice input
* Speech-to-text
* Identity / role processing
* Intent processing
* Entity processing
* Permission / scope validation
* AI read operations
* Controlled AI write operations
* Controlled AI update operations
* Existing API integration
* Structured result handling

---

# 🏆 What HospitaX Demonstrates

HospitaX brings together:

```text
                 PRODUCT THINKING
                       │
                       ▼
                     UI / UX
                       │
                       ▼
              FRONTEND ENGINEERING
                       │
                       ▼
                    REST APIs
                       │
                       ▼
                AUTHENTICATION
                       │
                       ▼
                     RBAC
                       │
                       ▼
                 BUSINESS LOGIC
                       │
                       ▼
                DATABASE DESIGN
                       │
                       ▼
               AI ORCHESTRATION
                       │
                       ▼
                TOOL / API LAYER
                       │
                       ▼
                   ANALYTICS
                       │
                       ▼
                   DEPLOYMENT
```

The project demonstrates how a modern full-stack platform can combine conventional software architecture with **controlled AI-assisted operations**.

---

# 📚 Learning Outcomes

Building HospitaX provides practical experience with:

* Full-stack application architecture
* React
* TypeScript
* Vite
* Tailwind CSS
* Python
* FastAPI
* REST APIs
* JWT authentication
* RBAC
* PostgreSQL
* SQLAlchemy
* Relational data modeling
* API integration
* Hospital workflow modeling
* Workforce management
* Clinical workflow modeling
* AI orchestration
* Tool/action architecture
* Voice-to-text integration
* Permission-aware AI
* Frontend/backend integration
* Production-oriented development

---

<div align="center">

<br />

**Author**

### Suryawanshi Swapnil

Computer Engineering Student · Full-Stack Developer

[![GitHub](https://img.shields.io/badge/GitHub-@jarvissi18-181717?style=for-the-badge\&logo=github\&logoColor=white)](https://github.com/jarvissi18)

</div>

---

# 📄 License

HospitaX is released under the **MIT License**.

See the [LICENSE](./LICENSE) file for details.

---

<div align="center">

# 🏥 HospitaX

### Digital Hospital Operations Platform

**Clinical Operations • Workforce Management • Analytics • AI Operations**

<br />

Built with

**React · TypeScript · FastAPI · Python · PostgreSQL · SQLAlchemy · Google Gemini**

<br />



</div>
