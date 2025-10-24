import { useAtomValue, useSetAtom } from "jotai";
import { useCallback, useRef } from "react";
import {
  importTrajectoryAtom,
  inputDataAtom,
  resetTrajectoryAtom,
  setGroundTruthAtom,
} from "@/state/traj";
import type { InputData } from "@/type/trajectory";
import { CONFIG } from "@/type/trajectory";

/**
 * Hook for importing trajectory data from JSON file
 */
export const useImport = () => {
  const importTrajectory = useSetAtom(importTrajectoryAtom);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const importData = useCallback(() => {
    // Create file input if not exists
    if (!fileInputRef.current) {
      fileInputRef.current = document.createElement("input");
      fileInputRef.current.type = "file";
      fileInputRef.current.accept = ".json";
    }

    fileInputRef.current.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);

        // Validate data structure
        if (!validateImportData(data)) {
          alert(
            "Invalid data format. Expected trajectory data with px, py, oz, vx, vy, wz arrays.",
          );
          return;
        }

        // Prepare data with padding/truncation
        const processedData: Partial<InputData> = {};
        const keys: (keyof InputData)[] = ["px", "py", "oz", "vx", "vy", "wz"];
        for (const key of keys) {
          if (data[key] && Array.isArray(data[key])) {
            processedData[key] = padOrTruncate(data[key], CONFIG.timeSteps);
          }
        }

        // Update atoms with imported data
        importTrajectory(processedData);

        alert("Data imported successfully!");
      } catch (error) {
        console.error("Import error:", error);
        alert("Failed to import data. Please check the file format.");
      }

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    };

    fileInputRef.current.click();
  }, [importTrajectory]);

  return importData;
};

/**
 * Hook for exporting trajectory data to JSON file
 */
export const useExport = () => {
  const inputData = useAtomValue(inputDataAtom);

  const exportData = useCallback(() => {
    const exportData = {
      timeSteps: CONFIG.timeSteps,
      dt: CONFIG.dt,
      ...inputData,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trajectory_data_${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [inputData]);

  return exportData;
};

/**
 * Hook for resetting trajectory data to default
 */
export const useInitialize = () => {
  const resetTrajectory = useSetAtom(resetTrajectoryAtom);

  const initialize = useCallback(() => {
    if (
      confirm("Reset all trajectory data to default? This cannot be undone.")
    ) {
      resetTrajectory();
    }
  }, [resetTrajectory]);

  return initialize;
};

/**
 * Hook for setting current data as ground truth
 */
export const useSetGroundTruth = () => {
  const setGroundTruth = useSetAtom(setGroundTruthAtom);

  const setAsGroundTruth = useCallback(() => {
    setGroundTruth();
  }, [setGroundTruth]);

  return setAsGroundTruth;
};

/**
 * Validate imported data structure
 */
function validateImportData(data: unknown): data is Partial<InputData> {
  if (!data || typeof data !== "object") return false;

  const requiredKeys: (keyof InputData)[] = [
    "px",
    "py",
    "oz",
    "vx",
    "vy",
    "wz",
  ];
  const hasAtLeastOneKey = requiredKeys.some(
    (key) =>
      key in data && Array.isArray((data as Record<string, unknown>)[key]),
  );

  return hasAtLeastOneKey;
}

/**
 * Pad array with zeros or truncate to target length
 */
function padOrTruncate(arr: number[], targetLength: number): number[] {
  if (arr.length === targetLength) return arr;
  if (arr.length > targetLength) return arr.slice(0, targetLength);

  const padded = [...arr];
  while (padded.length < targetLength) {
    padded.push(0);
  }
  return padded;
}
