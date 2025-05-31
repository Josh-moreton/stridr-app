import { NextRequest, NextResponse } from 'next/server';
import { calculateTrainingPaces, RecentPerformanceInput } from '@/lib/paceCalculator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { performanceInput }: { performanceInput: RecentPerformanceInput } = body;
    
    if (!performanceInput) {
      return NextResponse.json(
        { error: 'Performance input is required' },
        { status: 400 }
      );
    }

    const trainingPaces = calculateTrainingPaces(performanceInput);
    
    if (!trainingPaces) {
      return NextResponse.json(
        { error: 'Unable to calculate training paces from provided input' },
        { status: 400 }
      );
    }

    return NextResponse.json({ 
      success: true,
      trainingPaces 
    });

  } catch (error) {
    console.error('Error calculating training paces:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const distance = searchParams.get('distance');
  const time = searchParams.get('time');
  const customDistance = searchParams.get('customDistance');
  const customUnits = searchParams.get('customUnits') as 'km' | 'miles';

  if (!distance || !time) {
    return NextResponse.json(
      { error: 'Distance and time parameters are required' },
      { status: 400 }
    );
  }

  try {
    const performanceInput: RecentPerformanceInput = {
      recentRaceDistance: distance,
      recentRaceTime: time,
      ...(distance === 'Custom' && {
        customRaceDistanceValue: customDistance || undefined,
        customRaceDistanceUnits: customUnits || 'km'
      })
    };

    const trainingPaces = calculateTrainingPaces(performanceInput);
    
    if (!trainingPaces) {
      return NextResponse.json(
        { error: 'Unable to calculate training paces from provided input' },
        { status: 400 }
      );
    }

    return NextResponse.json({ 
      success: true,
      trainingPaces 
    });

  } catch (error) {
    console.error('Error calculating training paces:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
