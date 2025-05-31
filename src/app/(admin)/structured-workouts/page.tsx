import { createClient } from '@supabase/supabase-js';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '@/components/ui/table'; // Adjusted import path

// Define the interface for a single workout step
interface StructuredWorkoutStep {
  id: string;
  step_order: number | null; // Assuming steps can be ordered
  description: string | null; // The main description of the step
  // Add other relevant fields from structured_workout_steps table as needed
  // e.g., duration_value, duration_unit, target_type, target_value_low, target_value_high
}

// Define the interface for a structured workout based on your DB schema
interface StructuredWorkout {
  id: string;
  name: string;
  description: string | null;
  // sport: string; // Removed sport
  category: string | null;
  created_at: string;
  structured_workout_steps: StructuredWorkoutStep[]; // Added steps
  // Add other relevant fields if needed
}

// Converted to an async server component
async function StructuredWorkoutsPage() {
  let workouts: StructuredWorkout[] = [];
  let error: string | null = null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    error = "Supabase URL or Service Key is not configured.";
  } else {
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    try {
      const { data, error: fetchError } = await supabaseAdmin
        .from('structured_workouts')
        .select('id, name, description, category, created_at, structured_workout_steps(*)') // Fetch related steps
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }
      workouts = data || [];
    } catch (e: any) {
      error = `Failed to fetch workouts: ${e.message}`;
      console.error("Error fetching structured workouts:", e); // Log error on the server
    }
  }

  return (
    <>
      {/* Page Title - Consider adding a dedicated title component if available, or a simple h1 */}
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
        Structured Workout Templates
      </h1>
      {/* Applying BasicTableOne.tsx like structure and styling */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto">
          {error && (
            <div className="py-6 px-5 text-center text-red-500 dark:text-red-400">
              Error: {error}
            </div>
          )}
          {!error && workouts.length === 0 && (
            <div className="py-6 px-5 text-center text-gray-500 dark:text-gray-400">
              No structured workout templates found.
            </div>
          )}
          {!error && workouts.length > 0 && (
            <div className="min-w-[1000px]"> {/* Adjusted min-width based on content */} 
              <Table>
                <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                  <TableRow>
                    <TableCell
                      isHeader
                      className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      Name
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      Description
                    </TableCell>
                    {/* Removed Sport Header */}
                    <TableCell
                      isHeader
                      className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      Steps
                    </TableCell>
                    
                    <TableCell
                      isHeader
                      className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      Original Description
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      Created At
                    </TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {workouts.map((workout) => (
                    <TableRow key={workout.id}>
                      <TableCell className="px-5 py-4 sm:px-6 text-start">
                        <span className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                          {workout.name}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400 truncate max-w-xs">
                        {workout.description || '-'}
                      </TableCell>
                      {/* Removed Sport Cell */}
                      <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400 truncate max-w-lg">
                        {workout.structured_workout_steps && workout.structured_workout_steps.length > 0
                          ? workout.structured_workout_steps
                              .sort((a, b) => (a.step_order || 0) - (b.step_order || 0))
                              .map(step => `${step.step_order !== null ? step.step_order + '. ' : ''}${step.description || 'Step'}`)
                              .join('; ')
                          : 'No steps defined'}
                      </TableCell>

                      <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400 truncate max-w-md">
                        {workout.category || '-'}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        {new Date(workout.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default StructuredWorkoutsPage;
