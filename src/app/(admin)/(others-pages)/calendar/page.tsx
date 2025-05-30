import TrainingCalendar from "@/components/calendar/TrainingCalendar";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Training Calendar | Stridr Running App",
  description:
    "View and manage your running training calendar. Track workouts, see your training plan, and monitor your progress.",
};

export default function Calendar() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Training Calendar" />
      
      <div className="mb-6">
        <p className="text-gray-600 dark:text-gray-400">
          Your workouts and training plan are synced across all your devices. Add new workouts, edit existing ones, or view your upcoming schedule.
        </p>
      </div>
      
      <TrainingCalendar />
    </div>
  );
}
