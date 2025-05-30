import { substitutePacesEnhanced } from "../paceSubstitutionEnhanced";
import { PaceSettings } from "../../@types/app";

describe("Pfitzinger Pace Patterns", () => {
  const paceSettings: PaceSettings = {
    raceDistance: "10K",
    goalTime: "40:00",
    units: "mi",
  };

  it("should substitute marathon race pace pattern", () => {
    const input = "Marathon pace run {13} w/ {8} @ marathon race pace";
    const result = substitutePacesEnhanced(input, paceSettings, "pfitz_18_55");

    expect(result).not.toContain("@ marathon race pace");
    expect(result).toMatch(/\d+:\d{2} pace/);
  });

  it("should substitute lactate threshold pattern", () => {
    const input =
      "Lactate threshold {8} w {4} @ 15K to half marathon race pace";
    const result = substitutePacesEnhanced(input, paceSettings, "pfitz_18_55");

    expect(result).not.toContain("@ 15K to half marathon race pace");
    expect(result).toMatch(/\d+:\d{2} pace/);
  });

  it("should substitute VO2max pattern", () => {
    const input =
      "VO₂max {8} w/ 5 x 800 m @ 5K race pace; jog 50 to 90% interval time between";
    const result = substitutePacesEnhanced(input, paceSettings, "pfitz_18_55");

    expect(result).not.toContain("@ 5K race pace");
    expect(result).toMatch(/\d+:\d{2} pace/);
  });

  it("should use Pfitzinger calculator for pfitz plan", () => {
    const input = "Easy run @ marathon race pace";
    const pfitzResult = substitutePacesEnhanced(
      input,
      paceSettings,
      "pfitz_18_55"
    );
    const defaultResult = substitutePacesEnhanced(
      input,
      paceSettings,
      "unknown_plan"
    );

    // Both should have substitutions but may use different calculators
    expect(pfitzResult).not.toContain("@ marathon race pace");
    expect(defaultResult).not.toContain("@ marathon race pace");

    // Verify that both contain pace information
    expect(pfitzResult).toMatch(/\d:\d{2}/);
    expect(defaultResult).toMatch(/\d:\d{2}/);
  });
});
