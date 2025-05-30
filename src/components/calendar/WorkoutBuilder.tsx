"use client";
import React, { useState } from 'react';
import { 
  FitWorkoutFile, 
  FitWorkoutStep, 
  WORKOUT_STEP_TYPES,
  formatDuration,
  formatDistance,
  paceToMps,
  mpsToPace,
  createDefaultStructuredWorkout,
  validateWorkout,
  estimateWorkoutDuration,
  exportWorkoutAsFit,
  createIntervalBlock
} from '@/lib/fit-workout-service';
import { WORKOUT_TEMPLATES, WorkoutTemplate, getTemplatesByCategory, getAllCategories } from '@/lib/workout-templates-new';
import { Modal } from '@/components/ui/modal';

interface WorkoutBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (workout: FitWorkoutFile) => Promise<void>;
  existingWorkout?: FitWorkoutFile;
}

const WorkoutBuilder: React.FC<WorkoutBuilderProps> = ({
  isOpen,
  onClose,
  onSave,
  existingWorkout
}) => {
  const [workout, setWorkout] = useState<FitWorkoutFile>(() => 
    existingWorkout || createDefaultStructuredWorkout()
  );

  const [isSaving, setIsSaving] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('easy');
  const [showPreview, setShowPreview] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Validate workout on changes
  const handleWorkoutChange = (newWorkout: FitWorkoutFile) => {
    setWorkout(newWorkout);
    const validation = validateWorkout(newWorkout);
    setValidationErrors(validation.errors);
  };

  const updateWorkoutName = (name: string) => {
    handleWorkoutChange({ ...workout, workout_name: name });
  };

  const addStep = () => {
    const newStep: FitWorkoutStep = {
      step_index: workout.steps.length,
      ...WORKOUT_STEP_TYPES.EASY_RUN,
      duration_distance: 1000, // 1km default
      target_value: 5.0, // ~8:00/mile pace
    };

    handleWorkoutChange({
      ...workout,
      steps: [...workout.steps, newStep],
      num_valid_steps: workout.steps.length + 1
    });
  };

  const updateStep = (index: number, updates: Partial<FitWorkoutStep>) => {
    const newSteps = workout.steps.map((step, i) => 
      i === index ? { ...step, ...updates } : step
    );
    
    handleWorkoutChange({
      ...workout,
      steps: newSteps
    });
  };

  const removeStep = (index: number) => {
    const newSteps = workout.steps.filter((_, i) => i !== index)
      .map((step, i) => ({ ...step, step_index: i }));
    
    handleWorkoutChange({
      ...workout,
      steps: newSteps,
      num_valid_steps: newSteps.length
    });
  };

  const moveStep = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= workout.steps.length) return;

    const newSteps = [...workout.steps];
    const [movedStep] = newSteps.splice(fromIndex, 1);
    newSteps.splice(toIndex, 0, movedStep);
    
    // Update step indices
    const reindexedSteps = newSteps.map((step, i) => ({ ...step, step_index: i }));
    
    handleWorkoutChange({
      ...workout,
      steps: reindexedSteps
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(workout);
      onClose();
    } catch (error) {
      console.error('Error saving workout:', error);
      alert('Failed to save workout. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const loadTemplate = (template: WorkoutTemplate) => {
    handleWorkoutChange({
      ...template.workout,
      time_created: new Date()
    });
    setShowTemplates(false);
  };

  const addIntervalBlock = () => {
    // Create a proper interval block using repeat structure
    const intervalStep: FitWorkoutStep = {
      step_index: workout.steps.length,
      ...WORKOUT_STEP_TYPES.INTERVAL,
      duration_distance: 400, // 400m default
      target_value: 6.0, // ~6:40/mile pace
      repeat_steps: 4,
      step_name: '400m Intervals',
    };

    const recoveryStep: FitWorkoutStep = {
      step_index: workout.steps.length + 1,
      ...WORKOUT_STEP_TYPES.RECOVERY,
      duration_value: 90, // 90 seconds
      repeat_steps: 3, // One less than interval repeats
      step_name: 'Recovery Jog',
    };

    handleWorkoutChange({
      ...workout,
      steps: [...workout.steps, intervalStep, recoveryStep],
      num_valid_steps: workout.steps.length + 2
    });
  };

  const addPyramidBlock = () => {
    // Add a pyramid structure: 200m, 400m, 800m, 400m, 200m with recoveries
    const pyramidSteps: FitWorkoutStep[] = [
      // 200m
      {
        step_index: workout.steps.length,
        ...WORKOUT_STEP_TYPES.INTERVAL,
        duration_distance: 200,
        target_value: 6.5, // 5K pace
        step_name: '200m Build',
      },
      {
        step_index: workout.steps.length + 1,
        ...WORKOUT_STEP_TYPES.RECOVERY,
        duration_value: 60,
        step_name: '60s Recovery',
      },
      // 400m
      {
        step_index: workout.steps.length + 2,
        ...WORKOUT_STEP_TYPES.INTERVAL,
        duration_distance: 400,
        target_value: 6.0, // 5K pace
        step_name: '400m Build',
      },
      {
        step_index: workout.steps.length + 3,
        ...WORKOUT_STEP_TYPES.RECOVERY,
        duration_value: 90,
        step_name: '90s Recovery',
      },
      // 800m
      {
        step_index: workout.steps.length + 4,
        ...WORKOUT_STEP_TYPES.TEMPO_RUN,
        duration_distance: 800,
        target_value: 5.5, // Threshold pace
        step_name: '800m Peak',
      },
      {
        step_index: workout.steps.length + 5,
        ...WORKOUT_STEP_TYPES.RECOVERY,
        duration_value: 120,
        step_name: '2min Recovery',
      },
      // 400m down
      {
        step_index: workout.steps.length + 6,
        ...WORKOUT_STEP_TYPES.INTERVAL,
        duration_distance: 400,
        target_value: 6.0,
        step_name: '400m Down',
      },
      {
        step_index: workout.steps.length + 7,
        ...WORKOUT_STEP_TYPES.RECOVERY,
        duration_value: 90,
        step_name: '90s Recovery',
      },
      // 200m down
      {
        step_index: workout.steps.length + 8,
        ...WORKOUT_STEP_TYPES.INTERVAL,
        duration_distance: 200,
        target_value: 6.5,
        step_name: '200m Down',
      }
    ];

    handleWorkoutChange({
      ...workout,
      steps: [...workout.steps, ...pyramidSteps],
      num_valid_steps: workout.steps.length + pyramidSteps.length
    });
  };

  const addTempoBlock = () => {
    // Add a classic tempo block with build-in and build-out
    const tempoSteps: FitWorkoutStep[] = [
      {
        step_index: workout.steps.length,
        ...WORKOUT_STEP_TYPES.EASY_RUN,
        duration_distance: 1000, // 1km build
        target_value: 4.8, // Easy pace building to tempo
        step_name: 'Tempo Build-In',
      },
      {
        step_index: workout.steps.length + 1,
        ...WORKOUT_STEP_TYPES.TEMPO_RUN,
        duration_distance: 3000, // 3km tempo
        target_value: 5.2, // Threshold pace
        step_name: 'Tempo Sustain',
      },
      {
        step_index: workout.steps.length + 2,
        ...WORKOUT_STEP_TYPES.EASY_RUN,
        duration_distance: 1000, // 1km float down
        target_value: 4.8,
        step_name: 'Tempo Float Down',
      }
    ];

    handleWorkoutChange({
      ...workout,
      steps: [...workout.steps, ...tempoSteps],
      num_valid_steps: workout.steps.length + tempoSteps.length
    });
  };

  const getStepTypeOptions = () => Object.entries(WORKOUT_STEP_TYPES);

  const getIntensityColor = (intensity: string) => {
    switch (intensity) {
      case 'warmup': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'rest': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cooldown': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Add category options for templates
  const categoryOptions = [
    { value: 'easy', label: 'Easy', icon: '🚶' },
    { value: 'recovery', label: 'Recovery', icon: '💆' },
    { value: 'tempo', label: 'Tempo', icon: '🏃' },
    { value: 'interval', label: 'Intervals', icon: '⚡' },
    { value: 'long', label: 'Long Run', icon: '🏃‍♂️' }
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-4xl p-6">
      <div className="flex flex-col max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {existingWorkout ? 'Edit Structured Workout' : 'Create Structured Workout'}
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Build a multi-stage workout with warm-up, intervals, recovery, and cool-down phases
          </p>
          
          {/* Template and Quick Actions */}
          <div className="flex flex-wrap gap-2 mt-4">
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              📚 Templates
            </button>
            <button
              onClick={addIntervalBlock}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300"
            >
              ⚡ Add Interval Block
            </button>
            <button
              onClick={addPyramidBlock}
              className="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded hover:bg-purple-200 dark:bg-purple-900 dark:text-purple-300"
            >
              📈 Add Pyramid
            </button>
            <button
              onClick={addTempoBlock}
              className="px-3 py-1 text-sm bg-orange-100 text-orange-700 rounded hover:bg-orange-200 dark:bg-orange-900 dark:text-orange-300"
            >
              🏃 Add Tempo Block
            </button>
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 dark:bg-green-900 dark:text-green-300"
            >
              👁️ Preview
            </button>
          </div>
        </div>

        {/* Workout Summary */}
        <div className="mb-6 p-4 bg-green-50 rounded-lg dark:bg-green-900/20">
          <div className="flex justify-between items-center">
            <div className="flex gap-6 text-sm">
              <div>
                <span className="text-gray-600 dark:text-gray-400">Duration:</span>
                <span className="ml-2 font-medium text-green-700 dark:text-green-300">
                  ~{estimateWorkoutDuration(workout)} minutes
                </span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Steps:</span>
                <span className="ml-2 font-medium text-green-700 dark:text-green-300">
                  {workout.steps.length}
                </span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Status:</span>
                <span className={`ml-2 font-medium ${validationErrors.length === 0 ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                  {validationErrors.length === 0 ? '✓ Valid' : `${validationErrors.length} errors`}
                </span>
              </div>
            </div>
            {workout.id && (
              <button
                onClick={() => exportWorkoutAsFit(workout.id!)}
                className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 dark:bg-green-900 dark:text-green-300"
              >
                📥 Export FIT
              </button>
            )}
          </div>
        </div>

        {/* Templates Section */}
        {showTemplates && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg dark:bg-gray-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Workout Templates</h3>
            
            {/* Category Tabs */}
            <div className="flex gap-2 mb-4">
              {getAllCategories().map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-3 py-1 text-sm rounded ${
                    selectedCategory === category
                      ? 'bg-brand-500 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                >
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </button>
              ))}
            </div>
            
            {/* Template Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {getTemplatesByCategory(selectedCategory).map((template: WorkoutTemplate) => (
                <div
                  key={template.id}
                  onClick={() => loadTemplate(template)}
                  className="p-3 bg-white rounded border border-gray-200 hover:border-brand-300 cursor-pointer dark:bg-gray-700 dark:border-gray-600"
                >
                  <h4 className="font-medium text-gray-900 dark:text-white">{template.name}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{template.description}</p>
                  <div className="text-xs text-gray-500 mt-2">
                    ~{template.estimatedDuration} minutes • {template.workout.num_valid_steps} steps
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Workout Name */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Workout Name
          </label>
          <input
            type="text"
            value={workout.workout_name}
            onChange={(e) => updateWorkoutName(e.target.value)}
            placeholder="e.g., 5K Tempo with Intervals"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
          />
        </div>

        {/* Steps */}
        <div className="flex-1 overflow-y-auto mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Workout Steps ({workout.steps.length})
            </h3>
            <button
              onClick={addStep}
              className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors"
            >
              Add Step
            </button>
          </div>

          <div className="space-y-4">
            {workout.steps.map((step, index) => (
              <WorkoutStepEditor
                key={index}
                step={step}
                stepIndex={index}
                totalSteps={workout.steps.length}
                onUpdate={(updates) => updateStep(index, updates)}
                onRemove={() => removeStep(index)}
                onMoveUp={() => moveStep(index, index - 1)}
                onMoveDown={() => moveStep(index, index + 1)}
                getIntensityColor={getIntensityColor}
                getStepTypeOptions={getStepTypeOptions}
              />
            ))}
          </div>
        </div>

        {/* Preview Section */}
        {showPreview && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg dark:bg-gray-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Workout Preview</h3>
            
            {/* Visual Workout Structure */}
            <div className="space-y-3 mb-4">
              {workout.steps.map((step, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-white rounded border">
                  <div className="flex-shrink-0">
                    <span className="inline-flex items-center justify-center w-6 h-6 bg-brand-500 text-white rounded-full text-xs">
                      {index + 1}
                    </span>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900">
                        {step.step_name || 'Unnamed Step'}
                      </span>
                      {step.repeat_steps && step.repeat_steps > 1 && (
                        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                          {step.repeat_steps}x
                        </span>
                      )}
                      <span className={`text-xs px-2 py-1 rounded-full ${getIntensityColor(step.intensity)}`}>
                        {step.intensity}
                      </span>
                    </div>
                    
                    <div className="text-sm text-gray-600 flex items-center gap-4">
                      <span>
                        {step.duration_type === 'time' && step.duration_value 
                          ? formatDuration(step.duration_value)
                          : step.duration_type === 'distance' && step.duration_distance
                          ? formatDistance(step.duration_distance)
                          : 'Open duration'
                        }
                      </span>
                      
                      {step.target_type === 'pace' && step.target_value && (
                        <span>@ {mpsToPace(step.target_value)}/mile</span>
                      )}
                      
                      {step.notes && (
                        <span className="italic text-gray-500">"{step.notes}"</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* JSON Preview Toggle */}
            <button
              onClick={() => setShowPreview(prev => !prev)}
              className="text-sm text-brand-600 hover:text-brand-700 underline"
            >
              Toggle Raw JSON
            </button>
            
            {showPreview && (
              <pre className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap mt-3 p-3 bg-gray-100 rounded">
                {JSON.stringify(workout, null, 2)}
              </pre>
            )}
          </div>
        )}

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="mb-6 p-4 bg-red-50 rounded-lg dark:bg-red-900">
            <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-3">Validation Errors</h3>
            <ul className="list-disc list-inside text-sm text-red-800 dark:text-red-200">
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !workout.workout_name.trim()}
            className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? 'Saving...' : 'Save Workout'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

interface WorkoutStepEditorProps {
  step: FitWorkoutStep;
  stepIndex: number;
  totalSteps: number;
  onUpdate: (updates: Partial<FitWorkoutStep>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  getIntensityColor: (intensity: string) => string;
  getStepTypeOptions: () => [string, typeof WORKOUT_STEP_TYPES[keyof typeof WORKOUT_STEP_TYPES]][];
}

const WorkoutStepEditor: React.FC<WorkoutStepEditorProps> = ({
  step,
  stepIndex,
  totalSteps,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  getIntensityColor,
  getStepTypeOptions
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleStepTypeChange = (stepType: string) => {
    const template = WORKOUT_STEP_TYPES[stepType as keyof typeof WORKOUT_STEP_TYPES];
    onUpdate({
      ...template,
      step_name: template.step_name,
      // Reset values based on type
      duration_value: template.duration_type === 'time' ? 600 : undefined,
      duration_distance: template.duration_type === 'distance' ? 1000 : undefined,
      target_value: template.target_type === 'pace' ? 5.0 : undefined,
    });
  };

  const handlePaceChange = (paceString: string) => {
    try {
      const mps = paceToMps(paceString);
      onUpdate({ target_value: mps });
    } catch (error) {
      console.error('Invalid pace format:', paceString);
    }
  };

  const getCurrentPace = () => {
    if (step.target_value && step.target_type === 'pace') {
      return mpsToPace(step.target_value);
    }
    return '8:00';
  };

  return (
    <div className={`border rounded-lg p-4 ${getIntensityColor(step.intensity || 'active')}`}>
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium bg-white px-2 py-1 rounded border">
            Step {stepIndex + 1}
          </span>
          {step.repeat_steps && step.repeat_steps > 1 && (
            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full border border-orange-200">
              🔄 Repeat {step.repeat_steps}x
            </span>
          )}
          <input
            type="text"
            value={step.step_name || ''}
            onChange={(e) => onUpdate({ step_name: e.target.value })}
            placeholder="Step name"
            className="font-medium bg-transparent border-none focus:outline-none focus:ring-0 p-0"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={onMoveUp}
            disabled={stepIndex === 0}
            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
          >
            ↑
          </button>
          <button
            onClick={onMoveDown}
            disabled={stepIndex === totalSteps - 1}
            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
          >
            ↓
          </button>
          <button
            onClick={onRemove}
            className="p-1 text-red-400 hover:text-red-600"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Step Type */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1">Step Type</label>
          <select
            value={Object.entries(WORKOUT_STEP_TYPES).find(([_, template]) => 
              template.intensity === step.intensity && 
              template.target_type === step.target_type &&
              template.duration_type === step.duration_type
            )?.[0] || 'EASY_RUN'}
            onChange={(e) => handleStepTypeChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-brand-500"
          >
            {getStepTypeOptions().map(([key, template]) => (
              <option key={key} value={key}>
                {template.step_name}
              </option>
            ))}
          </select>
        </div>

        {/* Duration */}
        <div>
          <label className="block text-sm font-medium mb-1">Duration</label>
          <div className="flex gap-2">
            <select
              value={step.duration_type}
              onChange={(e) => onUpdate({ duration_type: e.target.value as any })}
              className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-brand-500"
            >
              <option value="time">Time</option>
              <option value="distance">Distance</option>
              <option value="open">Open</option>
            </select>
            
            {step.duration_type === 'time' && (
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={Math.floor((step.duration_value || 0) / 60)}
                  onChange={(e) => onUpdate({ 
                    duration_value: (parseInt(e.target.value) || 0) * 60 + ((step.duration_value || 0) % 60)
                  })}
                  className="w-16 px-2 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-brand-500"
                  placeholder="10"
                />
                <span className="text-sm">min</span>
              </div>
            )}
            
            {step.duration_type === 'distance' && (
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={(step.duration_distance || 0) / 1000}
                  onChange={(e) => onUpdate({ 
                    duration_distance: (parseFloat(e.target.value) || 0) * 1000
                  })}
                  step="0.1"
                  className="w-20 px-2 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-brand-500"
                  placeholder="5.0"
                />
                <span className="text-sm">km</span>
              </div>
            )}
          </div>
        </div>

        {/* Target Pace */}
        {step.target_type === 'pace' && (
          <div>
            <label className="block text-sm font-medium mb-1">Target Pace</label>
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={getCurrentPace()}
                onChange={(e) => handlePaceChange(e.target.value)}
                placeholder="8:00"
                pattern="[0-9]+:[0-5][0-9]"
                className="w-20 px-2 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-brand-500"
              />
              <span className="text-sm">/mile</span>
            </div>
          </div>
        )}
      </div>

      {/* Advanced Options Toggle */}
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="text-sm text-brand-600 hover:text-brand-700 mb-2"
      >
        {showAdvanced ? 'Hide' : 'Show'} Advanced Options
      </button>

      {/* Advanced Options */}
      {showAdvanced && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-white/50 rounded">
          <div>
            <label className="block text-sm font-medium mb-1">Repeat Steps</label>
            <input
              type="number"
              value={step.repeat_steps || ''}
              onChange={(e) => onUpdate({ repeat_steps: parseInt(e.target.value) || undefined })}
              placeholder="e.g., 8 for 8x intervals"
              min="1"
              max="20"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-brand-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Number of times to repeat this step
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Repeat Type</label>
            <select
              value={step.repeat_type || 'repeat_until_steps_cmplt'}
              onChange={(e) => onUpdate({ repeat_type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-brand-500"
            >
              <option value="repeat_until_steps_cmplt">Repeat Steps Complete</option>
              <option value="repeat_until_time">Repeat Until Time</option>
              <option value="repeat_until_distance">Repeat Until Distance</option>
            </select>
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Notes</label>
            <input
              type="text"
              value={step.notes || ''}
              onChange={(e) => onUpdate({ notes: e.target.value })}
              placeholder="Additional instructions, effort level, etc."
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-brand-500"
            />
          </div>
          
          {step.target_type === 'pace' && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Target Pace Range</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={step.target_low ? mpsToPace(step.target_low) : ''}
                  onChange={(e) => {
                    try {
                      const mps = paceToMps(e.target.value);
                      onUpdate({ target_low: mps });
                    } catch {}
                  }}
                  placeholder="7:30"
                  className="w-20 px-2 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-brand-500"
                />
                <span className="text-sm">to</span>
                <input
                  type="text"
                  value={step.target_high ? mpsToPace(step.target_high) : ''}
                  onChange={(e) => {
                    try {
                      const mps = paceToMps(e.target.value);
                      onUpdate({ target_high: mps });
                    } catch {}
                  }}
                  placeholder="8:00"
                  className="w-20 px-2 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-brand-500"
                />
                <span className="text-sm">/mile</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Set a pace range for more flexible targets
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WorkoutBuilder;
