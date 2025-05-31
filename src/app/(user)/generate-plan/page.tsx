'use client';

import { useState, ChangeEvent, FormEvent } from 'react';
import { calculateTrainingPaces, RecentPerformanceInput, TrainingPaces } from '@/lib/paceCalculator';
import { PlanConfiguration, TrainingPlan, WeeklySchedule, ScheduledRun } from '@/lib/planGenerator';
import { supabase } from '@/lib/supabase';

// Helper function to format pace from seconds/km to MM:SS/km
const formatPace = (secondsPerKm: number): string => {
  if (isNaN(secondsPerKm) || secondsPerKm <= 0) return 'N/A';
  const minutes = Math.floor(secondsPerKm / 60);
  const seconds = Math.round(secondsPerKm % 60);
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

// Helper function to format a pace range for display
const formatPacesForDisplay = (paceRange: { minPerKm: number; maxPerKm: number }): string => {
  if (!paceRange || isNaN(paceRange.minPerKm) || isNaN(paceRange.maxPerKm)) return 'N/A';
  return `${formatPace(paceRange.minPerKm)} - ${formatPace(paceRange.maxPerKm)} /km`;
};


export default function GeneratePlanPage() {
  const [formData, setFormData] = useState({
    raceName: '',
    raceDistance: '5k',
    customRaceDistanceValue: '',
    customRaceDistanceUnits: 'km' as 'km' | 'miles', // Initialize with a default valid value
    raceDate: '',
    recentRaceDistance: '5k',
    recentRaceTime: '',
    customRecentRaceDistanceValue: '',
    customRecentRaceDistanceUnits: 'km' as 'km' | 'miles', // Initialize with a default valid value
    experienceLevel: 'intermediate' as 'beginner' | 'intermediate' | 'advanced',
    weeklyVolume: 'medium' as 'low' | 'medium' | 'high',
  });
  const [calculatedPaces, setCalculatedPaces] = useState<TrainingPaces | null>(null);
  const [plan, setPlan] = useState<TrainingPlan | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCalendarOptions, setShowCalendarOptions] = useState(false);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setPlan(null);

    // Basic Validation (can be expanded)
    if (!formData.raceDate) {
      setError('Please select a race date.');
      setIsLoading(false);
      return;
    }
    if (formData.raceDistance === 'Custom' && !formData.customRaceDistanceValue) {
      setError('Please enter a custom race distance.');
      setIsLoading(false);
      return;
    }
    if (!formData.recentRaceTime) {
      setError('Please enter your recent race time.');
      setIsLoading(false);
      return;
    }

    // --- Placeholder for Plan Generation Logic ---
    // In the next steps, we'll call the pace calculation and plan generation services here.
    console.log('Form Submitted', formData);
    try {
      const recentPerformance: RecentPerformanceInput = {
        recentRaceDistance: formData.recentRaceDistance,
        recentRaceTime: formData.recentRaceTime,
        customRaceDistanceValue: formData.customRecentRaceDistanceValue,
        customRaceDistanceUnits: formData.customRecentRaceDistanceUnits,
      };

      // Step 1: Calculate training paces using the modular API
      const paceResponse = await fetch('/api/pace-calculator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ performanceInput: recentPerformance }),
      });

      if (!paceResponse.ok) {
        const paceError = await paceResponse.json();
        throw new Error(paceError.error || 'Failed to calculate training paces');
      }

      const { trainingPaces } = await paceResponse.json();
      setCalculatedPaces(trainingPaces);

      const planConfig: PlanConfiguration = {
        raceName: formData.raceName,
        raceDistance: formData.raceDistance,
        customRaceDistanceValue: formData.customRaceDistanceValue,
        customRaceDistanceUnits: formData.customRaceDistanceUnits as 'km' | 'miles',
        raceDate: formData.raceDate,
        trainingPaces, // Use paces from API
        experienceLevel: formData.experienceLevel,
        weeklyVolume: formData.weeklyVolume,
      };

      // Step 2: Generate the plan using the modular API
      const { data: { session } } = await supabase.auth.getSession();
      const access_token = session?.access_token;

      console.log('Calling training plan API with config:', planConfig);
      console.log('Session available:', !!session);
      console.log('Access token available:', !!access_token);

      const planResponse = await fetch('/api/training-plan/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(access_token && { 'Authorization': `Bearer ${access_token}` }),
        },
        body: JSON.stringify(planConfig),
      });

      console.log('Plan response status:', planResponse.status);
      console.log('Plan response headers:', Object.fromEntries(planResponse.headers.entries()));

      if (!planResponse.ok) {
        const planErrorText = await planResponse.text();
        console.log('Plan error response:', planErrorText);
        
        try {
          const planError = JSON.parse(planErrorText);
          throw new Error(planError.error || `Failed to generate plan: ${planResponse.statusText}`);
        } catch (parseError) {
          throw new Error(`Failed to generate plan (${planResponse.status}): ${planErrorText}`);
        }
      }

      const { plan: generatedPlan } = await planResponse.json();
      setPlan(generatedPlan);
    } catch (err: any) {
      setError(err.message || 'Failed to generate plan.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 text-black dark:text-white">
      <h1 className="text-3xl font-bold mb-8 text-center">Generate Your Training Plan</h1>

      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md">
        {/* Race Details Section */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 border-b pb-2">Race Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="raceName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Race Name (Optional)</label>
              <input
                type="text"
                name="raceName"
                id="raceName"
                value={formData.raceName}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="raceDistance" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Race Distance</label>
              <select
                name="raceDistance"
                id="raceDistance"
                value={formData.raceDistance}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                <option value="5k">5k</option>
                <option value="10k">10k</option>
                <option value="Half Marathon">Half Marathon</option>
                <option value="Marathon">Marathon</option>
                <option value="Custom">Custom</option>
              </select>
            </div>
          </div>

          {formData.raceDistance === 'Custom' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div>
                <label htmlFor="customRaceDistanceValue" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Custom Distance</label>
                <input
                  type="number"
                  name="customRaceDistanceValue"
                  id="customRaceDistanceValue"
                  value={formData.customRaceDistanceValue}
                  onChange={handleChange}
                  min="0.1"
                  step="0.1"
                  className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="e.g., 25"
                />
              </div>
              <div>
                <label htmlFor="customRaceDistanceUnits" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Units</label>
                <select
                  name="customRaceDistanceUnits"
                  id="customRaceDistanceUnits"
                  value={formData.customRaceDistanceUnits}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  <option value="km">km</option>
                  <option value="miles">miles</option>
                </select>
              </div>
            </div>
          )}

          <div className="mt-6">
            <label htmlFor="raceDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Race Date</label>
            <input
              type="date"
              name="raceDate"
              id="raceDate"
              value={formData.raceDate}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
        </section>

        {/* Current Fitness Section */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 border-b pb-2">Current Fitness</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="recentRaceDistance" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Recent Race Distance</label>
              <select
                name="recentRaceDistance"
                id="recentRaceDistance"
                value={formData.recentRaceDistance}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                <option value="1 mile">1 Mile</option>
                <option value="5k">5k</option>
                <option value="10k">10k</option>
                <option value="Half Marathon">Half Marathon</option>
                <option value="Marathon">Marathon</option>
              </select>
            </div>
            <div>
              <label htmlFor="recentRaceTime" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Recent Race Time</label>
              <input
                type="text"
                name="recentRaceTime"
                id="recentRaceTime"
                value={formData.recentRaceTime}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="MM:SS or HH:MM:SS"
              />
            </div>
          </div>
        </section>

        {/* Training Experience Section */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 border-b pb-2">Training Background</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="experienceLevel" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Running Experience</label>
              <select
                name="experienceLevel"
                id="experienceLevel"
                value={formData.experienceLevel}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                <option value="beginner">Beginner (0-2 years of consistent running)</option>
                <option value="intermediate">Intermediate (2-5 years, some racing experience)</option>
                <option value="advanced">Advanced (5+ years, competitive racing)</option>
              </select>
            </div>
            <div>
              <label htmlFor="weeklyVolume" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Current Weekly Volume</label>
              <select
                name="weeklyVolume"
                id="weeklyVolume"
                value={formData.weeklyVolume}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                <option value="low">Low (0-20km/week)</option>
                <option value="medium">Medium (20-40km/week)</option>
                <option value="high">High (40+km/week)</option>
              </select>
            </div>
          </div>
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Training Philosophy:</strong> Your plan will follow modern periodization with progressive overload, 
              deload weeks every 4th week, and race-specific training phases (Base → Build → Peak → Taper).
            </p>
          </div>
        </section>

        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 rounded-md">
            {error}
          </div>
        )}

        <div className="text-center">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full md:w-auto inline-flex justify-center py-2 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {isLoading ? 'Generating...' : 'Generate Plan'}
          </button>
        </div>
      </form>

      {isLoading && <p>Generating your training plan...</p>}
      {error && <p className="text-red-500">Error: {error}</p>}

      {calculatedPaces && (
        <div className="mt-6 p-4 border border-gray-300 rounded-md bg-white dark:bg-gray-800">
          <h2 className="text-xl font-semibold mb-4">Your Training Paces</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold text-sm text-gray-600 dark:text-gray-400 mb-2">ENDURANCE PACES</h3>
              <p><strong>Easy:</strong> {formatPacesForDisplay(calculatedPaces.easyPace)}</p>
              <p><strong>Tempo:</strong> {formatPacesForDisplay(calculatedPaces.tempoPace)}</p>
              <p><strong>Long Run:</strong> {formatPacesForDisplay(calculatedPaces.longRunPace)}</p>
            </div>
            <div>
              <h3 className="font-semibold text-sm text-gray-600 dark:text-gray-400 mb-2">SPEED PACES</h3>
              <p><strong>Interval:</strong> {formatPacesForDisplay(calculatedPaces.intervalPace)}</p>
              {calculatedPaces.vdot && (
                <p><strong>VDOT:</strong> {calculatedPaces.vdot.toFixed(1)}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {plan && (
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          {/* Plan Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6">
            <h2 className="text-2xl font-bold mb-2">Your Training Plan</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="font-medium">Race</p>
                <p>{plan.planConfiguration.raceName || plan.planConfiguration.raceDistance}</p>
              </div>
              <div>
                <p className="font-medium">Race Date</p>
                <p>{new Date(plan.planConfiguration.raceDate).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="font-medium">Duration</p>
                <p>{plan.totalWeeks} weeks</p>
              </div>
              <div>
                <p className="font-medium">Start Date</p>
                <p>{new Date(plan.startDate).toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          {/* Plan Summary */}
          {plan.planSummary && (
            <div className="p-6 bg-gray-50 dark:bg-gray-700 border-b">
              <h3 className="font-semibold text-lg mb-2">Plan Overview</h3>
              <p className="text-gray-700 dark:text-gray-300">{plan.planSummary}</p>
            </div>
          )}

          {/* Training Phases Overview */}
          <div className="p-6 border-b">
            <h3 className="font-semibold text-lg mb-4">Training Phases</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {['Base', 'Build', 'Peak', 'Taper'].map((phase) => {
                const phaseWeeks = plan.weeklySchedules.filter(w => w.phase === phase);
                if (phaseWeeks.length === 0) return null;
                
                return (
                  <div key={phase} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <h4 className="font-medium text-sm text-gray-600 dark:text-gray-400">{phase.toUpperCase()}</h4>
                    <p className="text-lg font-bold">{phaseWeeks.length} weeks</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Weeks {phaseWeeks[0]?.weekNumber}-{phaseWeeks[phaseWeeks.length - 1]?.weekNumber}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Calendar Integration Button */}
          <div className="p-6 border-b bg-gray-50 dark:bg-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">Schedule to Calendar</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Add all workouts to your training calendar
                </p>
              </div>
              <button
                onClick={() => setShowCalendarOptions(!showCalendarOptions)}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {showCalendarOptions ? 'Hide Options' : 'Schedule Plan'}
              </button>
            </div>
            
            {showCalendarOptions && (
              <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-md border">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Choose how to schedule your training plan:
                </p>
                <div className="space-y-2">
                  <button className="w-full text-left p-3 border rounded-md hover:bg-gray-50 dark:hover:bg-gray-700">
                    <div className="font-medium">Add to Stridr Calendar</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Schedule all workouts in your Stridr training calendar</div>
                  </button>
                  <button className="w-full text-left p-3 border rounded-md hover:bg-gray-50 dark:hover:bg-gray-700">
                    <div className="font-medium">Export as ICS File</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Download calendar file to import into any calendar app</div>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Weekly Breakdown */}
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Weekly Training Schedule</h3>
            <div className="space-y-4">
              {plan.weeklySchedules.map((week: WeeklySchedule) => (
                <div key={week.weekNumber} className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
                  {/* Week Header */}
                  <div className={`p-4 ${
                    week.phase === 'Base' ? 'bg-blue-50 dark:bg-blue-900/20' :
                    week.phase === 'Build' ? 'bg-green-50 dark:bg-green-900/20' :
                    week.phase === 'Peak' ? 'bg-orange-50 dark:bg-orange-900/20' :
                    'bg-purple-50 dark:bg-purple-900/20'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-lg">
                          Week {week.weekNumber} 
                          <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                            week.phase === 'Base' ? 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100' :
                            week.phase === 'Build' ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' :
                            week.phase === 'Peak' ? 'bg-orange-100 text-orange-800 dark:bg-orange-800 dark:text-orange-100' :
                            'bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-100'
                          }`}>
                            {week.phase}
                          </span>
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {new Date(week.startDate).toLocaleDateString()} - {new Date(week.endDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {week.totalWeeklyDistance ? `${(week.totalWeeklyDistance / 1000).toFixed(1)}km` : 'N/A'}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Total Volume</p>
                      </div>
                    </div>
                    {week.summary && (
                      <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">{week.summary}</p>
                    )}
                  </div>

                  {/* Daily Workouts */}
                  <div className="divide-y divide-gray-200 dark:divide-gray-600">
                    {week.runs.map((run: ScheduledRun) => (
                      <div key={run.date} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-sm font-medium text-gray-500 dark:text-gray-400 min-w-[60px]">
                                {new Date(run.date).toLocaleDateString('en-US', { weekday: 'short' })}
                              </span>
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                run.runType === 'Easy' || run.runType === 'Recovery' ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' :
                                run.runType === 'Tempo' ? 'bg-orange-100 text-orange-800 dark:bg-orange-800 dark:text-orange-100' :
                                run.runType === 'Interval' || run.runType === 'Hill Repeats' ? 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100' :
                                run.runType === 'Long' ? 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100' :
                                run.runType === 'Rest' ? 'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200' :
                                'bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-100'
                              }`}>
                                {run.runType}
                              </span>
                            </div>
                            
                            <h5 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                              {run.description}
                            </h5>
                            
                            {run.totalDistance && run.totalDuration && (
                              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-2">
                                <span>{(run.totalDistance / 1000).toFixed(1)}km</span>
                                <span>{Math.floor(run.totalDuration / 60)}:{(run.totalDuration % 60).toString().padStart(2, '0')}</span>
                              </div>
                            )}

                            {run.steps && run.steps.length > 1 && (
                              <div className="mt-2 space-y-1">
                                {run.steps.map((step, stepIndex) => (
                                  <div key={stepIndex} className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                                    <span className="w-2 h-2 bg-gray-400 rounded-full flex-shrink-0"></span>
                                    <span>{step.description}</span>
                                    {step.targetPace && (
                                      <span className="text-xs bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded">
                                        {formatPace(step.targetPace.minPerKm)} - {formatPace(step.targetPace.maxPerKm)} /km
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            {run.notes && (
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 italic">
                                💡 {run.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

