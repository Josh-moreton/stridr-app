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
import { getWorkoutEvents, saveWorkoutEvent, updateWorkoutEvent, TrainingWorkout } from "@/lib/supabase-service";

interface CalendarEvent extends EventInput {
  extendedProps: {
    calendar: string;
    description?: string;
    workoutType?: string;
    distance?: number;
    pace?: string;
    trainingPlanId?: string;
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

  useEffect(() => {
    const loadEvents = async () => {
      setIsLoading(true);
      setErrorMessage("");
      
      try {
        // First check if we have training plan data in localStorage (from previous page)
        const trainPlanData = localStorage.getItem('trainingPlanData');
        
        // Load events from Supabase if user is logged in
        if (user) {
          try {
            const workoutEvents = await getWorkoutEvents();
            
            if (workoutEvents && workoutEvents.length > 0) {
              // Convert Supabase workout events to calendar events
              const calendarEvents: CalendarEvent[] = workoutEvents.map(workout => ({
                id: workout.id,
                title: workout.title,
                start: workout.start_date,
                end: workout.end_date,
                allDay: workout.all_day,
                extendedProps: {
                  calendar: workout.color || "Success",
                  description: workout.description,
                  workoutType: workout.workout_type,
                  distance: workout.distance,
                  pace: workout.pace
                }
              }));
              
              setEvents(calendarEvents);
            } else if (trainPlanData) {
              // If no events in Supabase but we have training plan data, generate sample event
              const planData = JSON.parse(trainPlanData);
              
              const sampleEvent: CalendarEvent = {
                id: Date.now().toString(),
                title: `${planData.plan.name} - Sample Workout`,
                start: new Date().toISOString().split('T')[0],
                allDay: true,
                extendedProps: { 
                  calendar: "Primary",
                  description: "This is a sample workout from your training plan. Add your own workouts using the 'Add Workout +' button!",
                  workoutType: "Easy",
                  pace: planData.paces?.easy ? `${planData.paces.easy.min}:${String(planData.paces.easy.sec).padStart(2, '0')}` : "8:30"
                }
              };
              
              setEvents([sampleEvent]);
            } else {
              // User logged in but no data yet - show welcome message
              setEvents([]);
            }
          } catch (dbError) {
            console.warn('Database not ready yet, using demo mode:', dbError);
            // Show demo events if database isn't set up yet
            setEvents([
              {
                id: "demo-1",
                title: "Easy Run (Demo)",
                start: new Date().toISOString().split("T")[0],
                extendedProps: { 
                  calendar: "Success",
                  workoutType: "Easy",
                  distance: 5,
                  pace: "9:30",
                  description: "Demo workout - set up your database to save real workouts!"
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
    resetModalFields();
    setEventStartDate(selectInfo.startStr);
    setEventEndDate(selectInfo.endStr || selectInfo.startStr);
    openModal();
  };

  const handleEventClick = (clickInfo: EventClickArg) => {
    const event = clickInfo.event;
    setSelectedEvent(event as unknown as CalendarEvent);
    setEventTitle(event.title);
    setEventDescription(event.extendedProps.description || "");
    setEventStartDate(event.start?.toISOString().split("T")[0] || "");
    setEventEndDate(event.end?.toISOString().split("T")[0] || event.start?.toISOString().split("T")[0] || "");
    setEventLevel(event.extendedProps.calendar);
    openModal();
  };

  const handleAddOrUpdateEvent = async () => {
    try {
      if (!eventTitle.trim()) {
        alert("Please enter a workout title");
        return;
      }
      
      const isUserLoggedIn = !!user;
      
      if (selectedEvent) {
        // Update existing event
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
        
        if (isUserLoggedIn) {
          // Update in Supabase
          const workoutUpdate = {
            title: eventTitle,
            description: eventDescription,
            start_date: eventStartDate,
            end_date: eventEndDate !== eventStartDate ? eventEndDate : null,
            workout_type: selectedEvent.extendedProps.workoutType || "Other",
            color: eventLevel,
            all_day: true
          };
          
          await updateWorkoutEvent(selectedEvent.id as string, workoutUpdate);
        }
      } else {
        // Add new event
        const newEventId = isUserLoggedIn ? undefined : Date.now().toString();
        
        const newEvent: CalendarEvent = {
          id: newEventId,
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
          // Save to Supabase first, then update local state with the returned data
          const workoutToAdd = {
            title: eventTitle,
            description: eventDescription || "",
            start_date: eventStartDate,
            end_date: (eventEndDate && eventEndDate !== eventStartDate) ? eventEndDate : null, // Fix: use null instead of empty string
            workout_type: "Other",
            color: eventLevel || "Success",
            all_day: true
          };
          
          console.log("Attempting to save workout:", workoutToAdd);
          
          const savedWorkout = await saveWorkoutEvent(workoutToAdd);
          console.log("Saved workout successfully:", savedWorkout);
          
          // Update the event with the ID from the database
          newEvent.id = savedWorkout.id;
          
          setEvents((prevEvents) => [...prevEvents, newEvent]);
        } else {
          // Just add to local state for demo mode
          setEvents((prevEvents) => [...prevEvents, newEvent]);
        }
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
            left: "prev,next addEventButton",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay",
          }}
          events={events}
          selectable={true}
          select={handleDateSelect}
          eventClick={handleEventClick}
          eventContent={renderEventContent}
          customButtons={{
            addEventButton: {
              text: "Add Workout +",
              click: openModalForNewEvent, // Use this instead of just openModal
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
