"use client";
import React, { useState, useEffect } from 'react';
import { createWorkoutTables } from '@/lib/migration-runner';
import { saveStructuredWorkout, getUserStructuredWorkouts, FitWorkoutFile } from '@/lib/fit-workout-service';
import { WORKOUT_TEMPLATES } from '@/lib/workout-templates';
import WorkoutBuilder from '@/components/calendar/WorkoutBuilder';

export default function TestWorkoutsPage() {
  const [migrationStatus, setMigrationStatus] = useState<'pending' | 'running' | 'success' | 'error'>('pending');
  const [migrationError, setMigrationError] = useState<string>('');
  const [userWorkouts, setUserWorkouts] = useState<FitWorkoutFile[]>([]);
  const [isWorkoutBuilderOpen, setIsWorkoutBuilderOpen] = useState(false);
  const [testStatus, setTestStatus] = useState<string>('');
  
  const handleRunMigration = async () => {
    setMigrationStatus('running');
    setMigrationError('');
    
    try {
      await createWorkoutTables();
      setMigrationStatus('success');
      setTestStatus('Migration completed successfully');
    } catch (error) {
      setMigrationStatus('error');
      setMigrationError(error instanceof Error ? error.message : 'Unknown error');
      setTestStatus('Migration failed');
    }
  };

  const handleTestTemplates = async () => {
    setTestStatus('Testing templates...');
    
    try {
      // Test saving each template
      for (const template of WORKOUT_TEMPLATES.slice(0, 3)) { // Test first 3 templates
        const workoutData = {
          ...template.workout,
          workout_name: `Test: ${template.name}`,
          time_created: new Date()
        };
        
        console.log(`Saving template: ${template.name}`);
        await saveStructuredWorkout(workoutData);
      }
      
      setTestStatus('Templates saved successfully');
      await loadUserWorkouts();
    } catch (error) {
      setTestStatus(`Template test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const loadUserWorkouts = async () => {
    try {
      const workouts = await getUserStructuredWorkouts();
      setUserWorkouts(workouts);
    } catch (error) {
      console.error('Error loading user workouts:', error);
    }
  };

  const handleWorkoutSaved = async (workout: FitWorkoutFile) => {
    setTestStatus(`Workout "${workout.workout_name}" saved successfully`);
    setIsWorkoutBuilderOpen(false);
    await loadUserWorkouts();
  };

  useEffect(() => {
    loadUserWorkouts();
  }, []);

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Workout System Test Interface</h1>
      
      {/* Migration Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Database Migration</h2>
        <p className="text-gray-600 mb-4">
          Test if workout tables exist and are accessible.
        </p>
        
        <button
          onClick={handleRunMigration}
          disabled={migrationStatus === 'running'}
          className={`px-4 py-2 rounded-md text-white font-medium ${
            migrationStatus === 'running'
              ? 'bg-gray-400 cursor-not-allowed'
              : migrationStatus === 'success'
              ? 'bg-green-600 hover:bg-green-700'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {migrationStatus === 'running' ? 'Checking...' : 'Check Database Tables'}
        </button>
        
        {migrationStatus === 'success' && (
          <div className="mt-3 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
            ✅ Database tables are ready!
          </div>
        )}
        
        {migrationStatus === 'error' && (
          <div className="mt-3 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            ❌ Error: {migrationError}
          </div>
        )}
      </div>

      {/* Template Testing Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Template Testing</h2>
        <p className="text-gray-600 mb-4">
          Test saving workout templates to the database.
        </p>
        
        <div className="flex gap-4 mb-4">
          <button
            onClick={handleTestTemplates}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
          >
            Save Test Templates
          </button>
          
          <button
            onClick={() => setIsWorkoutBuilderOpen(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Create Custom Workout
          </button>
        </div>
        
        {testStatus && (
          <div className="p-3 bg-blue-100 border border-blue-400 text-blue-700 rounded">
            {testStatus}
          </div>
        )}
      </div>

      {/* Available Templates */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Available Templates</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {WORKOUT_TEMPLATES.map((template) => (
            <div key={template.id} className="border rounded-lg p-4">
              <h3 className="font-semibold text-lg">{template.name}</h3>
              <p className="text-gray-600 text-sm mb-2">{template.description}</p>
              <div className="flex justify-between items-center">
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  {template.category}
                </span>
                <span className="text-xs text-gray-500">
                  {template.estimatedDuration}min
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {template.workout.num_valid_steps} steps
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* User Workouts */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Saved Workouts</h2>
        {userWorkouts.length === 0 ? (
          <p className="text-gray-500">No workouts saved yet.</p>
        ) : (
          <div className="space-y-4">
            {userWorkouts.map((workout) => (
              <div key={workout.id} className="border rounded-lg p-4">
                <h3 className="font-semibold">{workout.workout_name}</h3>
                <p className="text-sm text-gray-600">Sport: {workout.sport}</p>
                <p className="text-sm text-gray-600">Steps: {workout.num_valid_steps}</p>
                <p className="text-xs text-gray-500">
                  Created: {new Date(workout.time_created).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Workout Builder Modal */}
      {isWorkoutBuilderOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Create Custom Workout</h2>
              <button
                onClick={() => setIsWorkoutBuilderOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <WorkoutBuilder
              isOpen={isWorkoutBuilderOpen}
              onClose={() => setIsWorkoutBuilderOpen(false)}
              onSave={handleWorkoutSaved}
              selectedDate={new Date()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
    
    try {
      await createWorkoutTables();
      setMigrationStatus('success');
      loadUserWorkouts();
    } catch (error) {
      console.error('Migration failed:', error);
      setMigrationStatus('error');
      setMigrationError(error instanceof Error ? error.message : 'Unknown error');
    }
  };
  
  const loadUserWorkouts = async () => {
    try {
      const workouts = await getUserStructuredWorkouts();
      setUserWorkouts(workouts);
    } catch (error) {
      console.error('Error loading workouts:', error);
    }
  };
  
  const handleSaveTemplate = async (templateId: string) => {
    try {
      const template = WORKOUT_TEMPLATES.find(t => t.id === templateId);
      if (!template) return;
      
      const workoutId = await saveStructuredWorkout(template.workout);
      console.log('Saved template workout:', workoutId);
      loadUserWorkouts();
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Error saving template: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };
  
  const handleSaveWorkout = async (workout: FitWorkoutFile) => {
    try {
      const workoutId = await saveStructuredWorkout(workout);
      console.log('Saved workout:', workoutId);
      loadUserWorkouts();
    } catch (error) {
      console.error('Error saving workout:', error);
      throw error;
    }
  };
  
  useEffect(() => {
    loadUserWorkouts();
  }, []);
  
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
        Test Structured Workouts
      </h1>
      
      {/* Migration Section */}
      <div className="mb-8 p-6 bg-gray-50 rounded-lg dark:bg-gray-800">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Database Migration
        </h2>
        
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={handleRunMigration}
            disabled={migrationStatus === 'running'}
            className={`px-4 py-2 rounded-lg font-medium ${
              migrationStatus === 'success'
                ? 'bg-green-500 text-white'
                : migrationStatus === 'error'
                ? 'bg-red-500 text-white'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            {migrationStatus === 'running' 
              ? 'Running Migration...' 
              : migrationStatus === 'success'
              ? '✓ Migration Complete'
              : migrationStatus === 'error'
              ? '✗ Migration Failed'
              : 'Run Migration'
            }
          </button>
          
          <div className="text-sm">
            {migrationStatus === 'success' && (
              <span className="text-green-600 dark:text-green-400">
                Workout tables created successfully!
              </span>
            )}
            {migrationStatus === 'error' && (
              <span className="text-red-600 dark:text-red-400">
                {migrationError}
              </span>
            )}
          </div>
        </div>
      </div>
      
      {/* Templates Section */}
      <div className="mb-8 p-6 bg-gray-50 rounded-lg dark:bg-gray-800">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Test Templates ({WORKOUT_TEMPLATES.length} available)
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {WORKOUT_TEMPLATES.map((template) => (
            <div key={template.id} className="p-4 bg-white rounded-lg border dark:bg-gray-700 dark:border-gray-600">
              <h3 className="font-medium text-gray-900 dark:text-white">{template.name}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{template.description}</p>
              <div className="flex justify-between items-center mt-3">
                <span className="text-xs text-gray-500">
                  {template.category} • ~{template.estimatedDuration}min • {template.workout.steps.length} steps
                </span>
                <button
                  onClick={() => handleSaveTemplate(template.id)}
                  className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Save to DB
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Custom Workout Builder */}
      <div className="mb-8 p-6 bg-gray-50 rounded-lg dark:bg-gray-800">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Custom Workout Builder
        </h2>
        
        <button
          onClick={() => setIsWorkoutBuilderOpen(true)}
          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
        >
          Open Workout Builder
        </button>
      </div>
      
      {/* User Workouts */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Your Saved Workouts ({userWorkouts.length})
        </h2>
        
        {userWorkouts.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-400">
            No workouts saved yet. Try saving a template or creating a custom workout.
          </p>
        ) : (
          <div className="space-y-4">
            {userWorkouts.map((workout) => (
              <div key={workout.id} className="p-4 bg-white rounded-lg border dark:bg-gray-700 dark:border-gray-600">
                <h3 className="font-medium text-gray-900 dark:text-white">{workout.workout_name}</h3>
                <div className="flex gap-4 text-sm text-gray-600 dark:text-gray-400 mt-2">
                  <span>Sport: {workout.sport}</span>
                  <span>Steps: {workout.steps.length}</span>
                  <span>Created: {new Date(workout.time_created).toLocaleDateString()}</span>
                </div>
                <div className="mt-3">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">Steps:</h4>
                  <div className="mt-1 space-y-1">
                    {workout.steps.map((step, index) => (
                      <div key={index} className="text-xs text-gray-600 dark:text-gray-400">
                        {index + 1}. {step.step_name || 'Unnamed step'} ({step.intensity})
                        {step.duration_type === 'time' && step.duration_value && 
                          ` - ${Math.floor(step.duration_value / 60)}min`
                        }
                        {step.duration_type === 'distance' && step.duration_distance && 
                          ` - ${(step.duration_distance / 1000).toFixed(1)}km`
                        }
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Workout Builder Modal */}
      <WorkoutBuilder
        isOpen={isWorkoutBuilderOpen}
        onClose={() => setIsWorkoutBuilderOpen(false)}
        onSave={handleSaveWorkout}
      />
    </div>
  );
}
