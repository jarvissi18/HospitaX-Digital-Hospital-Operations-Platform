import {
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import WorkManagement from "../pages/work-management/WorkManagement";

// =====================================================
// AUTH
// =====================================================

import Login from "../pages/auth/Login";

import ProtectedRoute from "../components/auth/ProtectedRoute";
import AdminRoute from "../components/auth/AdminRoute";
import NurseRoute from "../components/auth/NurseRoute";

// =====================================================
// LAYOUT
// =====================================================

import MainLayout from "../layouts/MainLayout";

// =====================================================
// AI OPERATIONS
// =====================================================

import AIOperationsAssistant from "../pages/ai/AIOperationsAssistant";

// =====================================================
// WORKSPACE
// =====================================================

import Dashboard from "../pages/dashboard/Dashboard";
import AdminDashboard from "../pages/admin/AdminDashboard";
import DoctorDashboard from "../pages/doctor/DoctorDashboard";
import DoctorClinicalRecords from "../pages/clinical/DoctorClinicalRecords";
import NurseDashboard from "../pages/nurse/NurseDashboard";
import ReceptionistDashboard from "../pages/receptionist/ReceptionistDashboard";
import HousekeeperDashboard from "../pages/housekeeper/HousekeeperDashboard";

import Patients from "../pages/patients/Patients";
import PatientClinicalProfile from "../pages/patients/PatientClinicalProfile";
import NursingClinicalOperations from "../pages/nursing/NursingClinicalOperations";
import Analytics from "../pages/analytics/Analytics";
import Appointments from "../pages/appointments/Appointments";

// =====================================================
// LABORATORY
// Administrator / Doctor / Nurse
// =====================================================

import Lab from "../pages/Lab/Lab";

// =====================================================
// QUEUE & TRIAGE
// =====================================================

import PatientQueue from "../pages/queue/PatientQueue";

// =====================================================
// STAFF
// =====================================================

import Users from "../pages/Staff";

// =====================================================
// HOSPITAL STRUCTURE
// =====================================================

import Departments from "../pages/hospital/Departments";
import Floors from "../pages/hospital/Floors";
import Wards from "../pages/hospital/Wards";
import Rooms from "../pages/hospital/Rooms";
import Beds from "../pages/hospital/Beds";

// =====================================================
// HOSPITAL OPERATIONS
// =====================================================

import Housekeepers from "../pages/housekeepers/Housekeepers";

// =====================================================
// PROFILE
// =====================================================

import Profile from "../pages/profile/Profile";

// =====================================================
// SETTINGS
// =====================================================

import Settings from "../pages/settings/Settings";
import HospitalSettings from "../pages/settings/HospitalSettings";
import AdminSettings from "../pages/settings/AdminSettings";
import Attendance from "../pages/Attendance";

// =====================================================
// CONTEXT
// =====================================================

import { useAuth } from "../context/AuthContext";

// =====================================================
// ROLE DASHBOARD
// =====================================================

function RoleDashboard() {
  const { user } = useAuth();

  /*
   * Administrator
   * -------------------------------
   * Dedicated Administrator Operations Dashboard.
   */

  if (user?.role === "Administrator") {
    return (
      <AdminRoute>
        <AdminDashboard />
      </AdminRoute>
    );
  }

  /*
   * Staff
   * -------------------------------
   * Dedicated staff dashboards.
   */

  if (user?.role === "Doctor") {
    return <DoctorDashboard />;
  }

  if (user?.role === "Nurse") {
    return <NurseDashboard />;
  }

  if (user?.role === "Receptionist") {
    return <ReceptionistDashboard />;
  }

  if (user?.role === "Housekeeper") {
    return <HousekeeperDashboard />;
  }

  return <Dashboard />;
}

// =====================================================
// DOCTOR CLINICAL RECORDS ROUTE
// Doctor only
// =====================================================

function DoctorClinicalRecordsRoute() {
  const { user } = useAuth();

  if (user?.role !== "Doctor") {
    return (
      <Navigate
        to="/dashboard"
        replace
      />
    );
  }

  return <DoctorClinicalRecords />;
}

// =====================================================
// APPOINTMENTS ROUTE
// Administrator / Receptionist / Doctor
// =====================================================

function AppointmentsRoute() {
  const { user } = useAuth();

  const allowed =
    user?.role === "Administrator" ||
    user?.role === "Receptionist" ||
    user?.role === "Doctor";

  if (!allowed) {
    return (
      <Navigate
        to="/dashboard"
        replace
      />
    );
  }

  return <Appointments />;
}

// =====================================================
// QUEUE & TRIAGE ROUTE
// Administrator / Receptionist / Nurse / Doctor
// =====================================================

function PatientQueueRoute() {
  const { user } = useAuth();

  const allowed =
    user?.role === "Administrator" ||
    user?.role === "Receptionist" ||
    user?.role === "Nurse" ||
    user?.role === "Doctor";

  if (!allowed) {
    return (
      <Navigate
        to="/dashboard"
        replace
      />
    );
  }

  return <PatientQueue />;
}

// =====================================================
// LABORATORY ROUTE
// Administrator / Doctor / Nurse
// =====================================================

function LabRoute() {
  const { user } = useAuth();

  const allowed =
    user?.role === "Administrator" ||
    user?.role === "Doctor" ||
    user?.role === "Nurse";

  if (!allowed) {
    return (
      <Navigate
        to="/dashboard"
        replace
      />
    );
  }

  return <Lab />;
}

// =====================================================
// APP ROUTES
// =====================================================

export default function AppRoutes() {
  return (
    <Routes>
      {/* =================================================
          LOGIN
      ================================================= */}

      <Route
        path="/"
        element={<Login />}
      />

      <Route
        path="/login"
        element={<Login />}
      />

      {/* =================================================
          PROTECTED APPLICATION
      ================================================= */}

      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        {/* =================================================
            AI OPERATIONS ASSISTANT
            All authenticated hospital staff
        ================================================= */}

        <Route
          path="/ai-assistant"
          element={<AIOperationsAssistant />}
        />

        {/* =================================================
            WORK MANAGEMENT
        ================================================= */}

        <Route
          path="/work-management"
          element={<WorkManagement />}
        />

        {/* =================================================
            APPOINTMENTS
            Administrator / Receptionist / Doctor
        ================================================= */}

        <Route
          path="/appointments"
          element={<AppointmentsRoute />}
        />

        {/* =================================================
            QUEUE & TRIAGE
            Administrator / Receptionist / Nurse / Doctor
        ================================================= */}

        <Route
          path="/patient-queue"
          element={<PatientQueueRoute />}
        />

        {/* =================================================
            LABORATORY
            Administrator / Doctor / Nurse
        ================================================= */}

        <Route
          path="/lab"
          element={<LabRoute />}
        />

        {/* =================================================
            WORKSPACE
        ================================================= */}

        <Route
          path="/dashboard"
          element={<RoleDashboard />}
        />

        <Route
          path="/patients"
          element={<Patients />}
        />

        <Route
          path="/patients/:patientId"
          element={<PatientClinicalProfile />}
        />

        {/* =================================================
            DOCTOR CLINICAL RECORDS
            Doctor only
        ================================================= */}

        <Route
          path="/doctor/clinical-records"
          element={
            <DoctorClinicalRecordsRoute />
          }
        />

        {/* =================================================
            NURSE CLINICAL OPERATIONS
            Nurse only
        ================================================= */}

        <Route
          path="/nursing/clinical-operations"
          element={
            <NurseRoute>
              <NursingClinicalOperations />
            </NurseRoute>
          }
        />

        <Route
          path="/analytics"
          element={<Analytics />}
        />

        {/* =================================================
            STAFF
        ================================================= */}

        <Route
          path="/users"
          element={<Users />}
        />

        <Route
          path="/attendance"
          element={<Attendance />}
        />

        {/* =================================================
            HOSPITAL STRUCTURE
            Administrator only
        ================================================= */}

        <Route
          path="/departments"
          element={
            <AdminRoute>
              <Departments />
            </AdminRoute>
          }
        />

        <Route
          path="/floors"
          element={
            <AdminRoute>
              <Floors />
            </AdminRoute>
          }
        />

        <Route
          path="/wards"
          element={
            <AdminRoute>
              <Wards />
            </AdminRoute>
          }
        />

        <Route
          path="/rooms"
          element={
            <AdminRoute>
              <Rooms />
            </AdminRoute>
          }
        />

        <Route
          path="/beds"
          element={
            <AdminRoute>
              <Beds />
            </AdminRoute>
          }
        />

        {/* =================================================
            HOUSEKEEPING
            Administrator only
        ================================================= */}

        <Route
          path="/housekeepers"
          element={
            <AdminRoute>
              <Housekeepers />
            </AdminRoute>
          }
        />

        {/* =================================================
            PROFILE
            All authenticated users
        ================================================= */}

        <Route
          path="/profile"
          element={<Profile />}
        />

        {/* =================================================
            SETTINGS
            Administrator only
        ================================================= */}

        <Route
          path="/settings"
          element={
            <AdminRoute>
              <Settings />
            </AdminRoute>
          }
        />

        <Route
          path="/settings/hospital"
          element={
            <AdminRoute>
              <HospitalSettings />
            </AdminRoute>
          }
        />

        <Route
          path="/settings/admin"
          element={
            <AdminRoute>
              <AdminSettings />
            </AdminRoute>
          }
        />

       
      </Route>
    </Routes>
  );
}