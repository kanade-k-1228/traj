import { atom } from "jotai";
import { atomFamily, atomWithStorage } from "jotai/utils";
import type { InputData, Methods, OutputData } from "@/type/trajectory";
import { CONFIG, METHODS } from "@/type/trajectory";
import {
  calculateOutputData,
  getCompleteTrajectoryData,
} from "@/utils/trajectory";

// All data keys (input + output)
export type DataKey = keyof InputData | keyof OutputData;

export const inputDataAtomFamily = atomFamily((key: keyof InputData) =>
  atom<number[]>(getInitialDataForKey(key)),
);

export const outputDataAtomFamily = atomFamily((key: keyof OutputData) =>
  atom<number[]>(getInitialDataForKey(key)),
);

// Ground truth data storage
export const gtAtomFamily = atomFamily((_key: keyof InputData) =>
  atom<number[]>([]),
);

// Calculation mode selection
export const methodAtom = atomWithStorage<Methods>("method", "position");

// Initialize default trajectory data with S-curve
const initializeDefaultData = (): InputData => {
  const length = CONFIG.timeSteps;
  const px = new Array(length).fill(0);
  const py = new Array(length).fill(0);
  const oz = new Array(length).fill(0);
  const vx = new Array(length).fill(0);
  const vy = new Array(length).fill(0);
  const wz = new Array(length).fill(0);

  // Generate S-curve trajectory
  let x = 0;
  let y = 0;
  let theta = 0;

  for (let i = 0; i < length; i++) {
    const t = i / length;

    // S-curve yaw rate
    if (t < 0.3) {
      wz[i] = 0.3 * Math.sin((t * Math.PI) / 0.3);
    } else if (t < 0.7) {
      wz[i] = -0.3 * Math.sin(((t - 0.3) * Math.PI) / 0.4);
    }

    // Velocity profile (forward velocity)
    const speed = 10 + 3 * Math.sin(t * Math.PI * 2);

    // Update position and orientation
    theta += wz[i] * CONFIG.dt;
    vx[i] = speed * Math.cos(theta);
    vy[i] = speed * Math.sin(theta);

    x += vx[i] * CONFIG.dt;
    y += vy[i] * CONFIG.dt;

    px[i] = x;
    py[i] = y;
    oz[i] = theta;
  }

  return { px, py, oz, vx, vy, wz };
};

// Get initial data for a specific key
const getInitialDataForKey = (key: DataKey): number[] => {
  const defaultData = initializeDefaultData();
  if (key in defaultData) {
    return defaultData[key as keyof InputData];
  }
  // Output data starts with zeros
  return new Array(CONFIG.timeSteps).fill(0);
};

// Collect input data from atoms
export const inputDataAtom = atom((get) => {
  const inputData: InputData = {
    px: get(inputDataAtomFamily("px")),
    py: get(inputDataAtomFamily("py")),
    oz: get(inputDataAtomFamily("oz")),
    vx: get(inputDataAtomFamily("vx")),
    vy: get(inputDataAtomFamily("vy")),
    wz: get(inputDataAtomFamily("wz")),
  };
  return inputData;
});

// Complete trajectory data (with calculated values based on mode)
export const completeTrajectoryDataAtom = atom((get) => {
  const inputData = get(inputDataAtom);
  const mode = get(methodAtom);
  return getCompleteTrajectoryData(inputData, mode);
});

// Output data (computed from complete trajectory data)
const outputDataInternalAtom = atom((get) => {
  const completeData = get(completeTrajectoryDataAtom);
  const gtData = get(gtDataAtom);
  const hasGroundTruth = get(hasGroundTruthAtom);

  // Pass GT data only if it's been set
  return calculateOutputData(completeData, hasGroundTruth ? gtData : undefined);
});

// Sync output data and calculated input data to individual atoms
export const syncOutputDataAtom = atom(null, (get, set) => {
  const completeData = get(completeTrajectoryDataAtom);
  const outputData = get(outputDataInternalAtom);
  const mode = get(methodAtom);
  const activeInputs = new Set(METHODS[mode]?.inputs || []);

  // Sync output data (always)
  set(outputDataAtomFamily("ax"), outputData.ax);
  set(outputDataAtomFamily("ay"), outputData.ay);
  set(outputDataAtomFamily("cz"), outputData.cz);
  set(outputDataAtomFamily("l1"), outputData.l1);

  // Sync calculated input data (only for non-active inputs)
  const inputKeys: (keyof InputData)[] = ["px", "py", "oz", "vx", "vy", "wz"];
  for (const key of inputKeys) {
    if (!activeInputs.has(key)) {
      set(inputDataAtomFamily(key), completeData[key]);
    }
  }
});

// Atom to trigger output sync whenever complete data changes
export const outputDataAtom = atom(
  (get) => {
    const outputData = get(outputDataInternalAtom);
    // Automatically sync to atoms
    return outputData;
  },
  (_get, set) => {
    // Trigger sync when this atom is set
    set(syncOutputDataAtom);
  },
);

// Batch update atom for updating time series data
export const batchUpdateTimeSeriesAtom = atom(
  null,
  (
    get,
    set,
    {
      key,
      updates,
    }: {
      key: DataKey;
      updates: Array<{ index: number; value: number }>;
    },
  ) => {
    // Check if it's an output key
    const isOutputKey = ["ax", "ay", "cz", "l1"].includes(key);

    if (isOutputKey) {
      const currentData = get(outputDataAtomFamily(key as keyof OutputData));
      const newData = [...currentData];

      for (const update of updates) {
        newData[update.index] = update.value;
      }

      set(outputDataAtomFamily(key as keyof OutputData), newData);
    } else {
      const currentData = get(inputDataAtomFamily(key as keyof InputData));
      const newData = [...currentData];

      for (const update of updates) {
        newData[update.index] = update.value;
      }

      set(inputDataAtomFamily(key as keyof InputData), newData);

      // If input was updated, sync outputs
      set(syncOutputDataAtom);
    }
  },
);

// Reset to default data
export const resetTrajectoryAtom = atom(null, (_get, set) => {
  const defaultData = initializeDefaultData();
  set(inputDataAtomFamily("px"), defaultData.px);
  set(inputDataAtomFamily("py"), defaultData.py);
  set(inputDataAtomFamily("oz"), defaultData.oz);
  set(inputDataAtomFamily("vx"), defaultData.vx);
  set(inputDataAtomFamily("vy"), defaultData.vy);
  set(inputDataAtomFamily("wz"), defaultData.wz);

  // Reset outputs to zero
  const emptyData = new Array(CONFIG.timeSteps).fill(0);
  set(outputDataAtomFamily("ax"), emptyData);
  set(outputDataAtomFamily("ay"), emptyData);
  set(outputDataAtomFamily("cz"), emptyData);
  set(outputDataAtomFamily("l1"), emptyData);

  // Sync outputs based on reset inputs
  set(syncOutputDataAtom);
});

// Import trajectory data
export const importTrajectoryAtom = atom(
  null,
  (_get, set, data: Partial<InputData>) => {
    const keys: (keyof InputData)[] = ["px", "py", "oz", "vx", "vy", "wz"];
    for (const key of keys) {
      if (data[key] && Array.isArray(data[key])) {
        set(inputDataAtomFamily(key), data[key] as number[]);
      }
    }

    // Sync outputs after import
    set(syncOutputDataAtom);
  },
);

// Export trajectory data as JSON
export const exportTrajectoryAtom = atom((get) => {
  const inputData = get(inputDataAtom);
  return {
    timeSteps: CONFIG.timeSteps,
    dt: CONFIG.dt,
    ...inputData,
  };
});

// Collect ground truth data from atoms
export const gtDataAtom = atom((get) => {
  const gtData: InputData = {
    px: get(gtAtomFamily("px")),
    py: get(gtAtomFamily("py")),
    oz: get(gtAtomFamily("oz")),
    vx: get(gtAtomFamily("vx")),
    vy: get(gtAtomFamily("vy")),
    wz: get(gtAtomFamily("wz")),
  };
  return gtData;
});

// Check if ground truth data is set
export const hasGroundTruthAtom = atom((get) => {
  const gtData = get(gtDataAtom);
  // Check if any GT data has been set (non-empty arrays)
  return gtData.px.length > 0;
});

// Set current data as ground truth
export const setGroundTruthAtom = atom(null, (get, set) => {
  const inputData = get(inputDataAtom);
  const keys: (keyof InputData)[] = ["px", "py", "oz", "vx", "vy", "wz"];
  for (const key of keys) {
    set(gtAtomFamily(key), inputData[key]);
  }
});
