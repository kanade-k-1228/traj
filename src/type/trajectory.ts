export const CONFIG = {
  timeSteps: 33,
  dt: 0.1, // time step in seconds
  trajectoryColor: "#667eea",
};

// ----------------------------------------------------------------------------
// Inputs

export interface InputData {
  px: number[]; // Px: X位置 [m]
  py: number[]; // Py: Y位置 [m]
  oz: number[]; // θz: ヨー角 [rad]
  vx: number[]; // Vx: X方向速度 [m/s]
  vy: number[]; // Vy: Y方向速度 [m/s]
  wz: number[]; // Wz: ヨーレート [rad/s]
}

export interface GraphConfig {
  label: string;
  unit: string;
  color: string;
  minVal: number;
  maxVal: number;
}

export const INPUT_GRAPH: Record<keyof InputData, GraphConfig> = {
  px: {
    label: "Px",
    unit: "m",
    color: "#FF6B6B",
    minVal: 0,
    maxVal: 50,
  },
  py: {
    label: "Py",
    unit: "m",
    color: "#4ECDC4",
    minVal: -50,
    maxVal: 50,
  },
  oz: {
    label: "Oz",
    unit: "rad",
    color: "#FFA07A",
    minVal: -Math.PI,
    maxVal: Math.PI,
  },
  vx: {
    label: "Vx",
    unit: "m/s",
    color: "#45B7D1",
    minVal: 0,
    maxVal: 20,
  },
  vy: {
    label: "Vy",
    unit: "m/s",
    color: "#98D8C8",
    minVal: -20,
    maxVal: 20,
  },
  wz: {
    label: "Wz",
    unit: "rad/s",
    color: "#B19CD9",
    minVal: -1,
    maxVal: 1,
  },
};

// ----------------------------------------------------------------------------
// Outputs

export interface OutputData {
  ax: number[]; // Ax: X方向加速度 [m/s²]
  ay: number[]; // Ay: Y方向加速度 [m/s²]
  cz: number[]; // Cz: 曲率 [1/m]
  l1: number[]; // L1: L1 Loss
}

export type OutputKeys = "ax" | "ay" | "cz" | "l1";

export const OUTPUT_GRAPH: Record<OutputKeys, GraphConfig> = {
  ax: {
    label: "Ax",
    unit: "m/s²",
    color: "#3b82f6",
    minVal: -10,
    maxVal: 10,
  },
  ay: {
    label: "Ay",
    unit: "m/s²",
    color: "#10b981",
    minVal: -10,
    maxVal: 10,
  },
  cz: {
    label: "Cz",
    unit: "1/m",
    color: "#f59e0b",
    minVal: -0.2,
    maxVal: 0.2,
  },
  l1: {
    label: "L1",
    unit: "m",
    color: "#ec4899",
    minVal: 0,
    maxVal: 10,
  },
};

// ----------------------------------------------------------------------------
// Methods

export type Methods = "position" | "velocity" | "integral" | "differential";

export interface MethodConfig {
  inputs: (keyof InputData)[];
  name: string;
  description: string;
  color: string;
}

export const METHODS: Record<Methods, MethodConfig> = {
  position: {
    inputs: ["px", "py"],
    name: "Position",
    description: "位置から微分で速度を計算し、方位角は接線から算出",
    color: "#3b82f6",
  },
  velocity: {
    inputs: ["vx", "vy"],
    name: "Velocity",
    description: "速度から積分で位置を計算し、方位角は接線から算出",
    color: "#10b981",
  },
  integral: {
    inputs: ["vx", "wz"],
    name: "Integral",
    description: "X方向速度とヨーレートから積分で位置と方位角を計算",
    color: "#f59e0b",
  },
  differential: {
    inputs: ["px", "oz"],
    name: "Differential",
    description: "位置と方位角から微分で速度を計算",
    color: "#8b5cf6",
  },
};

export interface TrajectoryPoint {
  x: number;
  y: number;
  theta?: number;
}
