import { Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { RequireAuth } from "@/components/Guards";
import About from "@/pages/About";
import AdminDashboard from "@/pages/AdminDashboard";
import { ForgotPassword, Login, Register } from "@/pages/Auth";
import Certifications from "@/pages/Certifications";
import CourseDetail from "@/pages/CourseDetail";
import Courses from "@/pages/Courses";
import Dashboard from "@/pages/Dashboard";
import DiveForm from "@/pages/DiveForm";
import DiveLogPage from "@/pages/DiveLogPage";
import Goals from "@/pages/Goals";
import Home from "@/pages/Home";
import { InstructorDashboard } from "@/pages/InstructorDashboard";
import Instructors from "@/pages/Instructors";
import Learning from "@/pages/Learning";
import PersonalBests from "@/pages/PersonalBests";
import Profile from "@/pages/Profile";
import ProgressPage from "@/pages/ProgressPage";
import TableEditor from "@/pages/TableEditor";
import Training from "@/pages/Training";
import TrainingTimer from "@/pages/TrainingTimer";

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/courses" element={<Courses />} />
        <Route path="/courses/:slug" element={<CourseDetail />} />
        <Route path="/about" element={<About />} />
        <Route path="/instructors" element={<Instructors />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        <Route
          path="/app"
          element={
            <RequireAuth>
              <Dashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/app/dives"
          element={
            <RequireAuth>
              <DiveLogPage />
            </RequireAuth>
          }
        />
        <Route
          path="/app/dives/new"
          element={
            <RequireAuth>
              <DiveForm />
            </RequireAuth>
          }
        />
        <Route
          path="/app/dives/:id/edit"
          element={
            <RequireAuth>
              <DiveForm />
            </RequireAuth>
          }
        />
        <Route
          path="/app/personal-bests"
          element={
            <RequireAuth>
              <PersonalBests />
            </RequireAuth>
          }
        />
        <Route
          path="/app/progress"
          element={
            <RequireAuth>
              <ProgressPage />
            </RequireAuth>
          }
        />
        <Route
          path="/app/goals"
          element={
            <RequireAuth>
              <Goals />
            </RequireAuth>
          }
        />
        <Route
          path="/app/training"
          element={
            <RequireAuth>
              <Training />
            </RequireAuth>
          }
        />
        <Route
          path="/app/training/tables/:id"
          element={
            <RequireAuth>
              <TableEditor />
            </RequireAuth>
          }
        />
        <Route
          path="/app/training/run/:id"
          element={
            <RequireAuth>
              <TrainingTimer />
            </RequireAuth>
          }
        />
        <Route
          path="/app/learning"
          element={
            <RequireAuth>
              <Learning />
            </RequireAuth>
          }
        />
        <Route
          path="/app/certifications"
          element={
            <RequireAuth>
              <Certifications />
            </RequireAuth>
          }
        />
        <Route
          path="/app/profile"
          element={
            <RequireAuth>
              <Profile />
            </RequireAuth>
          }
        />

        <Route
          path="/instructor"
          element={
            <RequireAuth roles={["instructor", "admin"]}>
              <InstructorDashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/admin"
          element={
            <RequireAuth roles={["admin"]}>
              <AdminDashboard />
            </RequireAuth>
          }
        />

        <Route path="*" element={<Home />} />
      </Routes>
      <Toaster position="top-center" richColors />
    </>
  );
}
