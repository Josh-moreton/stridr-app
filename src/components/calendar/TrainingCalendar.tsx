"use client";
import React, { useState, useRef, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import {
  EventInput,
  DateSelectArg,
  EventClickArg,
  EventContentArg,
} from "@fullcalendar/core";
import { useModal } from "@/hooks/useModal";
import { Modal } from "@/components/ui/modal";
import { useAuth } from "@/context/AuthContext";
import { saveWorkoutEvent, updateWorkoutEvent, TrainingWorkout } from "@/lib/supabase-service";
import { saveStructuredWorkout, convertCalendarEventToStructuredWorkout, FitWorkoutFile, getUserStructuredWorkouts } from "@/lib/fit-workout-service";
import WorkoutBuilder from "./WorkoutBuilder";

interface CalendarEvent extends EventInput {
  extendedProps: {
    calendar: string;
    description?: string;
    workoutType?: string;
    distance?: number;
    pace?: string;
    trainingPlanId?: string;
    workout_file_id?: string;
  };
}

const TrainingCalendar: React.FC = () => {
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [eventTitle, setEventTitle] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [eventStartDate, setEventStartDate] = useState("");
  const [eventEndDate, setEventEndDate] = useState("");
  const [eventLevel, setEventLevel] = useState("");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isWorkoutBuilderOpen, setIsWorkoutBuilderOpen] = useState(false);
  const [selectedStructuredWorkout, setSelectedStructuredWorkout] = useState<FitWorkoutFile | undefined>();
  const [structuredWorkouts, setStructuredWorkouts] = useState<FitWorkoutFile[]>([]);
  const calendarRef = useRef<FullCalendar>(null);
  const { isOpen, openModal, closeModal } = useModal();
  const { user } = useAuth();

  // Mapping for workout types to colors
  const workoutTypes = {
    "Easy": "Success", // Green
    "Long": "Warning", // Orange
    "Threshold": "Danger", // Red
    "Interval": "Primary", // Blue
    "Recovery": "Success", // Green
    "Rest": "Default" // Gray
  };

  // Helper function to map run types to calendar display types
  const getCalendarTypeFromRunType = (runType: string): string => {
    switch (runType) {
      case 'Easy':
      case 'Recovery':
        return 'Success'; // Green
      case 'Long':
        return 'Warning'; // Orange
      case 'Threshold':
      case 'Tempo':
        return 'Danger'; // Red
      case 'Interval':
      case 'Speed':
        return 'Primary'; // Blue
      case 'Rest':
        return 'Default'; // Gray
      default:
        return 'Success'; // Default to green
    }
  };

  useEffect(() => {
    const loadEvents = async () => {
      setIsLoading(true);
      setErrorMessage("");
      
      try {
        // First check if we have training plan data in localStorage (from previous page)
        const trainPlanData = localStorage.getItem('trainingPlanData');
        
        // Load events using the new calendar API if user is logged in
        if (user) {
          try {
            // Calculate date range for current month plus/minus 1 month for better view
            const today = new Date();
            const startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().split('T')[0];
            const endDate = new Date(today.getFullYear(), today.getMonth() + 2, 0).toISOString().split('T')[0];
            
            // Use the new calendar API endpoint that reads from plan_scheduled_runs
            const response = await fetch(`/api/calendar?startDate=${startDate}&endDate=${endDate}`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              },
            });
            
            if (!response.ok) {
              throw new Error(`Calendar API error: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success && data.events && data.events.length > 0) {
              // Convert API events to calendar format
              const calendarEvents: CalendarEvent[] = data.events.map((event: any) => ({
                id: event.id,
                title: event.title,
                start: event.start,
                end: event.end,
                allDay: false, // Use the time from API
                backgroundColor: event.backgroundColor,
                borderColor: event.borderColor,
                extendedProps: {
                  calendar: getCalendarTypeFromRunType(event.runType),
                  description: event.description,
                  workoutType: event.runType,
                  distance: event.distance,
                  duration: event.duration,
                  completed: event.completed
                }
              }));
              
              setEvents(calendarEvents);
            } else {
              // No training plan events found - load structured workouts and provide helpful message
              const structuredWorkoutFiles = await getUserStructuredWorkouts();
              setStructuredWorkouts(structuredWorkoutFiles);
              
              const allEvents: CalendarEvent[] = [];
              
              if (structuredWorkoutFiles && structuredWorkoutFiles.length > 0) {
                const structuredEvents: CalendarEvent[] = structuredWorkoutFiles.map(workout => ({
                  id: `structured-${workout.id}`,
                  title: `📋 ${workout.workout_name}`,
                  start: workout.time_created instanceof Date 
                    ? workout.time_created.toISOString().split('T')[0] 
                    : new Date(workout.time_created).toISOString().split('T')[0],
                  allDay: true,
                  extendedProps: {
                    calendar: "Primary",
                    description: `Structured workout with ${workout.num_valid_steps} steps`,
                    workoutType: "Structured",
                    workout_file_id: workout.id
                  }
                }));
                allEvents.push(...structuredEvents);
              }
              
              if (trainPlanData) {
                // If no events in calendar API but we have training plan data, show helpful message
                const planData = JSON.parse(trainPlanData);
                
                const helpEvent: CalendarEvent = {
                  id: `help-${Date.now()}`,
                  title: `${planData.plan.name} - Generated Successfully!`,
                  start: new Date().toISOString().split('T')[0],
                  allDay: true,
                  extendedProps: { 
                    calendar: "Primary",
                    description: "Your training plan has been generated! The workouts are now available in your calendar.",
                    workoutType: "Info"
                  }
                };
                
                allEvents.push(helpEvent);
              }
              
              setEvents(allEvents);
            }
            
          } catch (dbError) {
            console.warn('Calendar API error, using fallback mode:', dbError);
            // Show demo events if API isn't available
            setEvents([
              {
                id: "demo-1",
                title: "Easy Run (Demo)",
                start: new Date().toISOString().split("T")[0],
                extendedProps: { 
                  calendar: "Success",
                  workoutType: "Easy",
                  distance: 5000,
                  description: "Demo workout - your training plan data will appear here once generated!"
                },
              }
            ]);
          }
        } else {
          // User not logged in, show demo events
          if (trainPlanData) {
            const planData = JSON.parse(trainPlanData);
            
            const sampleEvent: CalendarEvent = {
              id: Date.now().toString(),
              title: `${planData.plan.name} - Sample Workout`,
              start: new Date().toISOString().split('T')[0],
              allDay: true,
              extendedProps: { 
                calendar: "Primary",
                description: "This is a sample workout from your training plan.",
                workoutType: "Easy",
                pace: planData.paces?.easy ? `${planData.paces.easy.min}:${String(planData.paces.easy.sec).padStart(2, '0')}` : "8:30"
              }
            };
            
            setEvents([sampleEvent]);
          } else {
            // Initialize with demo events
            setEvents([
              {
                id: "1",
                title: "Easy Run",
                start: new Date().toISOString().split("T")[0],
                extendedProps: { 
                  calendar: "Success",
                  workoutType: "Easy",
                  distance: 5,
                  pace: "9:30" 
                },
              },
              {
                id: "2",
                title: "Threshold Workout",
                start: new Date(Date.now() + 86400000).toISOString().split("T")[0],
                extendedProps: { 
                  calendar: "Danger",
                  workoutType: "Threshold",
                  description: "6x800m @ threshold pace with 1 min recovery",
                  pace: "7:45"
                },
              },
              {
                id: "3",
                title: "Long Run",
                start: new Date(Date.now() + 432000000).toISOString().split("T")[0],
                extendedProps: { 
                  calendar: "Warning",
                  workoutType: "Long",
                  distance: 12,
                  pace: "9:45"
                },
              },
            ]);
          }
        }
      } catch (error) {
        console.error("Error loading calendar events:", error);
        setErrorMessage("Failed to load your calendar events. Using demo mode.");
        // Set demo events as fallback
        setEvents([
          {
            id: "demo-1",
            title: "Demo Easy Run",
            start: new Date().toISOString().split("T")[0],
            extendedProps: { 
              calendar: "Success",
              workoutType: "Easy",
              description: "Demo workout - sign in and set up database to save real workouts!"
            },
          }
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    loadEvents();
  }, [user]);

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    // Default to structured workout builder for better FIT file support
    setSelectedStructuredWorkout(undefined);
    setIsWorkoutBuilderOpen(true);
  };

  const handleEventClick = (clickInfo: EventClickArg) => {
    const event = clickInfo.event;
    
    // Check if this is a structured workout (has a workout_file_id)
    if (event.extendedProps.workout_file_id) {
      // Load the structured workout and open WorkoutBuilder
      const structuredWorkout = structuredWorkouts.find(w => w.id === event.extendedProps.workout_file_id);
      if (structuredWorkout) {
        setSelectedStructuredWorkout(structuredWorkout);
        setIsWorkoutBuilderOpen(true);
        return;
      }
    }
    
    // Fallback to simple modal for legacy events
    setSelectedEvent(event as unknown as CalendarEvent);
    setEventTitle(event.title);
    setEventDescription(event.extendedProps.description || "");
    setEventStartDate(event.start?.toISOString().split("T")[0] || "");
    setEventEndDate(event.end?.toISOString().split("T")[0] || event.start?.toISOString().split("T")[0] || "");
    setEventLevel(event.extendedProps.calendar);
    openModal();
  };

  const handleSaveStructuredWorkout = async (workout: FitWorkoutFile) => {
    try {
      if (!user) {
        alert("Please sign in to save structured workouts");
        return;
      }

      const workoutId = await saveStructuredWorkout(workout);
      
      // Create calendar event for the structured workout
      const calendarEvent: CalendarEvent = {
        id: `structured-${workoutId}`,
        title: workout.workout_name,
        start: new Date().toISOString().split('T')[0], // Today by default
        allDay: true,
        extendedProps: {
          calendar: "Primary",
          description: `Structured workout with ${workout.num_valid_steps} steps`,
          workoutType: "Structured",
          workout_file_id: workoutId
        }
      };

      // Also save as a simple workout event for calendar display
      const workoutEvent = {
        title: workout.workout_name,
        description: `Structured workout with ${workout.num_valid_steps} steps`,
        start_date: new Date().toISOString().split('T')[0],
        end_date: null,
        workout_type: "Structured",
        color: "Primary",
        all_day: true
      };

      await saveWorkoutEvent(workoutEvent);
      
      setEvents(prev => [...prev, calendarEvent]);
      setStructuredWorkouts(prev => [...prev, { ...workout, id: workoutId }]);
      setIsWorkoutBuilderOpen(false);
    } catch (error) {
      console.error('Error saving structured workout:', error);
      alert('Failed to save structured workout. Please try again.');
    }
  };

  const handleAddOrUpdateEvent = async () => {
    try {
      if (!eventTitle.trim()) {
        alert("Please enter a workout title");
        return;
      }
      
      const isUserLoggedIn = !!user;
      
      if (selectedEvent) {
        // Update existing event using calendar API
        if (isUserLoggedIn) {
          const response = await fetch('/api/calendar', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              eventId: selectedEvent.id,
              newDate: eventStartDate,
              updates: {
                title: eventTitle,
                description: eventDescription,
                distance: selectedEvent.extendedProps.distance || null,
                duration: (selectedEvent.extendedProps as any).duration || null
              }
            }),
          });

          if (!response.ok) {
            throw new Error(`Failed to update event: ${response.status}`);
          }
        }

        // Update local state
        const updatedEvents = events.map((event) =>
          event.id === selectedEvent.id
            ? {
                ...event,
                title: eventTitle,
                start: eventStartDate,
                end: eventEndDate,
                extendedProps: { 
                  ...event.extendedProps,
                  calendar: eventLevel,
                  description: eventDescription
                },
              }
            : event
        );
        
        setEvents(updatedEvents);
      } else {
        // Add new event using calendar API
        const newEvent: CalendarEvent = {
          id: Date.now().toString(), // Temporary ID
          title: eventTitle,
          start: eventStartDate,
          end: eventEndDate !== eventStartDate ? eventEndDate : undefined,
          allDay: true,
          extendedProps: { 
            calendar: eventLevel || "Success", 
            description: eventDescription,
            workoutType: "Other"
          },
        };
        
        if (isUserLoggedIn) {
          // Use calendar API to save new event
          const response = await fetch('/api/calendar', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              title: eventTitle,
              description: eventDescription,
              date: eventStartDate,
              runType: 'Other',
              distance: null,
              duration: null
            }),
          });

          if (!response.ok) {
            throw new Error(`Failed to create event: ${response.status}`);
          }

          const result = await response.json();
          if (result.success) {
            // Update event with real ID from database
            newEvent.id = result.eventId || newEvent.id;
          }
        }
        
        setEvents((prevEvents) => [...prevEvents, newEvent]);
      }
      
      closeModal();
      resetModalFields();
    } catch (error) {
      console.error("Full error object:", error);
      const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
      alert(`Failed to save workout: ${errorMessage}. Please check the console for more details.`);
    }
  };

  const resetModalFields = () => {
    setEventTitle("");
    setEventDescription("");
    // Set default dates to today instead of empty strings
    const today = new Date().toISOString().split("T")[0];
    setEventStartDate(today);
    setEventEndDate(today);
    setEventLevel("Success");
    setSelectedEvent(null);
  };

  const openModalForNewEvent = () => {
    resetModalFields();
    openModal();
  };

  const openWorkoutBuilderForNewWorkout = () => {
    setSelectedStructuredWorkout(undefined);
    setIsWorkoutBuilderOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-16 h-16 border-t-4 border-brand-500 border-solid rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading your workouts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      {errorMessage && (
        <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-t-2xl dark:bg-red-200 dark:text-red-800">
          {errorMessage}
        </div>
      )}
      
      {!user && (
        <div className="p-4 mb-4 text-sm text-blue-700 bg-blue-100 border-b border-gray-200 dark:border-gray-700 dark:bg-blue-900/30 dark:text-blue-400">
          <p>You&apos;re using the calendar in demo mode. <a href="/signin" className="font-medium underline">Sign in</a> to save your workouts across devices.</p>
        </div>
      )}
      
      <div className="custom-calendar">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: "prev,next",
            center: "title",
            right: "structuredWorkoutButton,simpleWorkoutButton dayGridMonth,timeGridWeek,timeGridDay",
          }}
          events={events}
          selectable={true}
          select={handleDateSelect}
          eventClick={handleEventClick}
          eventContent={renderEventContent}
          customButtons={{
            structuredWorkoutButton: {
              text: "📋 Structured Workout",
              click: openWorkoutBuilderForNewWorkout,
            },
            simpleWorkoutButton: {
              text: "+ Quick Add",
              click: openModalForNewEvent,
            },
          }}
        />
      </div>
      
      <Modal
        isOpen={isOpen}
        onClose={closeModal}
        className="max-w-[700px] p-6 lg:p-10"
      >
        <div className="flex flex-col px-2 overflow-y-auto custom-scrollbar">
          <div>
            <h5 className="mb-2 font-semibold text-gray-800 modal-title text-theme-xl dark:text-white/90 lg:text-2xl">
              {selectedEvent ? "Edit Workout" : "Add Workout"}
            </h5>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {selectedEvent 
                ? "Update your training session details" 
                : "Plan your next training session and add it to your calendar"}
            </p>
          </div>

          <div className="mt-8">
            <div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                  Workout Title
                </label>
                <input
                  id="event-title"
                  type="text"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                  placeholder="e.g., 5K Tempo Run, Long Run, Recovery Run"
                />
              </div>
            </div>
            
            <div className="mt-6">
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Description (Optional)
              </label>
              <textarea
                id="event-description"
                value={eventDescription}
                onChange={(e) => setEventDescription(e.target.value)}
                className="dark:bg-dark-900 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                placeholder="E.g., 2 mile warmup, 4x800m at threshold pace with 200m recovery jog, 1 mile cooldown"
                rows={3}
              ></textarea>
            </div>
            
            <div className="mt-6">
              <label className="block mb-4 text-sm font-medium text-gray-700 dark:text-gray-400">
                Workout Type
              </label>
              <div className="flex flex-wrap items-center gap-4 sm:gap-5">
                {Object.entries(workoutTypes).map(([key, value]) => (
                  <div key={key} className="n-chk">
                    <div
                      className={`form-check form-check-${value.toLowerCase()} form-check-inline`}
                    >
                      <label
                        className="flex items-center text-sm text-gray-700 form-check-label dark:text-gray-400"
                        htmlFor={`modal${key}`}
                      >
                        <span className="relative">
                          <input
                            className="sr-only form-check-input"
                            type="radio"
                            name="event-level"
                            value={value}
                            id={`modal${key}`}
                            checked={eventLevel === value}
                            onChange={() => setEventLevel(value)}
                          />
                          <span className="flex items-center justify-center w-5 h-5 mr-2 border border-gray-300 rounded-full box dark:border-gray-700">
                            <span
                              className={`h-2 w-2 rounded-full bg-white ${
                                eventLevel === value ? "block" : "hidden"
                              }`}  
                            ></span>
                          </span>
                        </span>
                        {key}
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Workout Date
              </label>
              <div className="relative">
                <input
                  id="event-start-date"
                  type="date"
                  value={eventStartDate}
                  onChange={(e) => setEventStartDate(e.target.value)}
                  className="dark:bg-dark-900 h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent bg-none px-4 py-2.5 pl-4 pr-11 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                />
              </div>
            </div>

            {eventEndDate !== eventStartDate && (
              <div className="mt-6">
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                  End Date (Multi-day Event)
                </label>
                <div className="relative">
                  <input
                    id="event-end-date"
                    type="date"
                    value={eventEndDate}
                    onChange={(e) => setEventEndDate(e.target.value)}
                    className="dark:bg-dark-900 h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent bg-none px-4 py-2.5 pl-4 pr-11 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                  />
                </div>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-3 mt-6 modal-footer sm:justify-end">
            <button
              onClick={closeModal}
              type="button"
              className="flex w-full justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] sm:w-auto"
            >
              Cancel
            </button>
            <button
              onClick={handleAddOrUpdateEvent}
              type="button"
              className="btn btn-success btn-update-event flex w-full justify-center rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 sm:w-auto"
            >
              {selectedEvent ? "Update Workout" : "Add Workout"}
            </button>
          </div>
        </div>
      </Modal>

      <WorkoutBuilder
        isOpen={isWorkoutBuilderOpen}
        onClose={() => setIsWorkoutBuilderOpen(false)}
        onSave={handleSaveStructuredWorkout}
        existingWorkout={selectedStructuredWorkout}
      />
    </div>
  );
};

const renderEventContent = (eventInfo: EventContentArg) => {
  const colorClass = `fc-bg-${eventInfo.event.extendedProps.calendar.toLowerCase()}`;
  
  // Check if this is a training plan workout
  const hasWorkoutDetails = eventInfo.event.extendedProps.workoutType || 
                            eventInfo.event.extendedProps.pace ||
                            eventInfo.event.extendedProps.distance;
  
  return (
    <div
      className={`event-fc-color flex fc-event-main ${colorClass} p-1 rounded-sm ${hasWorkoutDetails ? 'font-medium' : ''}`}
    >
      <div className="fc-daygrid-event-dot"></div>
      <div className="fc-event-time">{eventInfo.timeText}</div>
      <div className="fc-event-title">
        {eventInfo.event.title}
        {eventInfo.event.extendedProps.pace && (
          <span className="text-xs block opacity-80"> 
            {eventInfo.event.extendedProps.distance && `${eventInfo.event.extendedProps.distance} mi @ `}
            {eventInfo.event.extendedProps.pace}/mi
          </span>
        )}
      </div>
    </div>
  );
};

export default TrainingCalendar;
