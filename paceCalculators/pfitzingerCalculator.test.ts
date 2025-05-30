import { PfitzingerPaceCalculator } from "../paceCalculators/pfitzingerCalculator";

describe("PfitzingerPaceCalculator", () => {
  let calculator: PfitzingerPaceCalculator;

  beforeEach(() => {
    calculator = new PfitzingerPaceCalculator();
  });

  it("should calculate faster training paces for faster race times", () => {
    // Test case 1: 20:00 5K (faster)
    const raceTime1 = { distance: "5K" as const, timeInSeconds: 20 * 60 };
    const paces1 = calculator.calculatePaces(raceTime1, "km");

    // Test case 2: 22:00 5K (slower)
    const raceTime2 = { distance: "5K" as const, timeInSeconds: 22 * 60 };
    const paces2 = calculator.calculatePaces(raceTime2, "km");

    // Faster race time should produce faster training paces
    expect(paces1.easy).toBeLessThan(paces2.easy);
    expect(paces1.marathon).toBeLessThan(paces2.marathon);
    expect(paces1.threshold).toBeLessThan(paces2.threshold);
    expect(paces1.interval).toBeLessThan(paces2.interval);
    expect(paces1.recovery).toBeLessThan(paces2.recovery);
    expect(paces1.long).toBeLessThan(paces2.long);
  });

  it("should calculate reasonable pace ranges", () => {
    // Test with 20:00 5K (4:00/km race pace)
    const raceTime = { distance: "5K" as const, timeInSeconds: 20 * 60 };
    const paces = calculator.calculatePaces(raceTime, "km");

    // Race pace is 240 seconds per km (4:00/km)
    const racePace = 240;

    // Verify pace relationships
    expect(paces.easy).toBeGreaterThan(racePace); // Easy should be slower than race pace
    expect(paces.marathon).toBeGreaterThan(racePace); // Marathon should be slower than race pace
    expect(paces.threshold).toBeGreaterThan(racePace); // Threshold should be slower than race pace
    expect(paces.interval).toBeLessThan(racePace); // Interval should be faster than race pace
    expect(paces.recovery).toBeGreaterThan(paces.easy); // Recovery should be slower than easy

    // Log actual values for debugging
    console.log("Race pace (4:00/km):", racePace, "seconds");
    console.log("Easy:", paces.easy, "seconds");
    console.log("Marathon:", paces.marathon, "seconds");
    console.log("Threshold:", paces.threshold, "seconds");
    console.log("Interval:", paces.interval, "seconds");
    console.log("Recovery:", paces.recovery, "seconds");
    console.log("Long:", paces.long, "seconds");
  });
});
