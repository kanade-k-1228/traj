import type {
  InputData,
  Methods,
  OutputData,
  TrajectoryPoint,
} from "@/type/trajectory";
import { CONFIG } from "@/type/trajectory";

/**
 * Calculate from px, py: differentiate to get velocities, calculate oz from direction
 */
function calculateFromPxPy(data: InputData): InputData {
  const length = data.px.length;
  const vx = new Array(length).fill(0);
  const vy = new Array(length).fill(0);
  const oz = new Array(length).fill(0);
  const wz = new Array(length).fill(0);

  for (let i = 0; i < length; i++) {
    if (i < length - 1) {
      // Use forward difference for better accuracy
      vx[i] = (data.px[i + 1] - data.px[i]) / CONFIG.dt;
      vy[i] = (data.py[i + 1] - data.py[i]) / CONFIG.dt;
    } else {
      // Last point: use backward difference
      vx[i] = (data.px[i] - data.px[i - 1]) / CONFIG.dt;
      vy[i] = (data.py[i] - data.py[i - 1]) / CONFIG.dt;
    }

    // Calculate orientation from velocity
    const speed = Math.sqrt(vx[i] * vx[i] + vy[i] * vy[i]);
    if (speed > 0.01) {
      oz[i] = Math.atan2(vy[i], vx[i]);
    } else if (i > 0) {
      oz[i] = oz[i - 1]; // Keep previous orientation if stationary
    }

    // Calculate yaw rate
    if (i > 0) {
      let dtheta = oz[i] - oz[i - 1];
      // Normalize angle difference to [-pi, pi]
      while (dtheta > Math.PI) dtheta -= 2 * Math.PI;
      while (dtheta < -Math.PI) dtheta += 2 * Math.PI;
      wz[i] = dtheta / CONFIG.dt;
    }
  }

  return { ...data, vx, vy, oz, wz };
}

/**
 * Calculate from vx, vy: integrate to get positions, calculate oz from direction
 */
function calculateFromVxVy(data: InputData): InputData {
  const length = data.vx.length;
  const px = new Array(length).fill(0);
  const py = new Array(length).fill(0);
  const oz = new Array(length).fill(0);
  const wz = new Array(length).fill(0);

  // Preserve initial position if available
  let x = data.px?.[0] || 0;
  let y = data.py?.[0] || 0;

  for (let i = 0; i < length; i++) {
    px[i] = x;
    py[i] = y;

    // Calculate orientation from velocity
    const speed = Math.sqrt(data.vx[i] * data.vx[i] + data.vy[i] * data.vy[i]);
    if (speed > 0.01) {
      oz[i] = Math.atan2(data.vy[i], data.vx[i]);
    } else if (i > 0) {
      oz[i] = oz[i - 1];
    }

    if (i > 0) {
      let dtheta = oz[i] - oz[i - 1];
      // Normalize angle difference to [-pi, pi]
      while (dtheta > Math.PI) dtheta -= 2 * Math.PI;
      while (dtheta < -Math.PI) dtheta += 2 * Math.PI;
      wz[i] = dtheta / CONFIG.dt;
    }

    x += data.vx[i] * CONFIG.dt;
    y += data.vy[i] * CONFIG.dt;
  }

  return { ...data, px, py, oz, wz };
}

/**
 * Calculate from vx, wz: integrate to get positions and orientation
 * Assumption: velocity direction aligns with vehicle orientation (no slip)
 */
function calculateFromVxWz(data: InputData): InputData {
  const length = data.vx.length;
  const px = new Array(length).fill(0);
  const py = new Array(length).fill(0);
  const oz = new Array(length).fill(0);
  const vy = new Array(length).fill(0);

  // Preserve initial position and orientation if available
  let x = data.px?.[0] || 0;
  let y = data.py?.[0] || 0;
  let theta = data.oz?.[0] || 0;

  for (let i = 0; i < length; i++) {
    // Store current state
    px[i] = x;
    py[i] = y;
    oz[i] = theta;

    // Calculate vy assuming velocity aligns with orientation: vy/vx = tan(oz)
    vy[i] = data.vx[i] * Math.tan(theta);

    // Integrate position
    x += data.vx[i] * CONFIG.dt;
    y += vy[i] * CONFIG.dt;

    // Integrate orientation for next step
    theta += data.wz[i] * CONFIG.dt;

    // Normalize theta to [-pi, pi]
    while (theta > Math.PI) theta -= 2 * Math.PI;
    while (theta < -Math.PI) theta += 2 * Math.PI;
  }

  return { ...data, px, py, oz, vy };
}

/**
 * Calculate from px, oz: differentiate to get velocities
 */
function calculateFromPxOz(data: InputData): InputData {
  const length = data.px.length;
  const py = new Array(length).fill(0);
  const vx = new Array(length).fill(0);
  const vy = new Array(length).fill(0);
  const wz = new Array(length).fill(0);

  // Preserve initial py if available
  let y = data.py?.[0] || 0;

  for (let i = 0; i < length; i++) {
    // Calculate vx from px derivative
    if (i < length - 1) {
      vx[i] = (data.px[i + 1] - data.px[i]) / CONFIG.dt;
    } else {
      vx[i] = (data.px[i] - data.px[i - 1]) / CONFIG.dt;
    }

    // Calculate vy assuming velocity aligns with orientation: vy = vx * tan(oz)
    vy[i] = vx[i] * Math.tan(data.oz[i]);

    // Calculate yaw rate
    if (i > 0) {
      let dtheta = data.oz[i] - data.oz[i - 1];
      // Normalize angle difference to [-pi, pi]
      while (dtheta > Math.PI) dtheta -= 2 * Math.PI;
      while (dtheta < -Math.PI) dtheta += 2 * Math.PI;
      wz[i] = dtheta / CONFIG.dt;
    }

    // Integrate vy to get py
    py[i] = y;
    y += vy[i] * CONFIG.dt;
  }

  return { ...data, py, vx, vy, wz };
}

/**
 * Get complete trajectory data based on calculation mode
 */
export function getCompleteTrajectoryData(
  data: InputData,
  mode: Methods,
): InputData {
  switch (mode) {
    case "position":
      return calculateFromPxPy(data);
    case "velocity":
      return calculateFromVxVy(data);
    case "integral":
      return calculateFromVxWz(data);
    case "differential":
      return calculateFromPxOz(data);
    default:
      return data;
  }
}

/**
 * Calculate trajectory points from position and orientation data
 */
export function calculateTrajectory(data: InputData): TrajectoryPoint[] {
  const trajectory: TrajectoryPoint[] = [];

  // Safety check for data structure
  if (!data.px || !data.py || !data.oz) {
    return [{ x: 0, y: 0, theta: 0 }];
  }

  for (let i = 0; i < data.px.length; i++) {
    trajectory.push({
      x: data.px[i],
      y: data.py[i],
      theta: data.oz[i],
    });
  }

  return trajectory;
}

/**
 * Calculate output data (acceleration and curvature) from input data
 */
export function calculateOutputData(
  data: InputData,
  gtData?: InputData,
): OutputData {
  // Safety check for data structure
  if (!data.px || !data.py || !data.oz || !data.vx || !data.vy || !data.wz) {
    const emptyLength = CONFIG.timeSteps;
    return {
      ax: new Array(emptyLength).fill(0),
      ay: new Array(emptyLength).fill(0),
      cz: new Array(emptyLength).fill(0),
      l1: new Array(emptyLength).fill(0),
    };
  }

  const length = data.px.length;
  const ax = new Array(length).fill(0);
  const ay = new Array(length).fill(0);
  const cz = new Array(length).fill(0);
  const l1 = new Array(length).fill(0);

  for (let i = 0; i < length; i++) {
    // Calculate acceleration from velocity differences
    if (i > 0) {
      ax[i] = (data.vx[i] - data.vx[i - 1]) / CONFIG.dt;
      ay[i] = (data.vy[i] - data.vy[i - 1]) / CONFIG.dt;
    }

    // Calculate curvature from velocity and yaw rate
    // curvature = wz / v (where v is the total velocity magnitude)
    const v = Math.sqrt(data.vx[i] * data.vx[i] + data.vy[i] * data.vy[i]);
    if (v > 0.1) {
      cz[i] = data.wz[i] / v;
    } else {
      cz[i] = 0;
    }

    // Calculate L1 loss if ground truth data is provided
    if (gtData?.px && gtData?.py && i < gtData.px.length) {
      const dx = data.px[i] - gtData.px[i];
      const dy = data.py[i] - gtData.py[i];
      l1[i] = Math.sqrt(dx * dx + dy * dy); // Euclidean distance
    }
  }

  return { ax, ay, cz, l1 };
}

/**
 * Find bounds of trajectory for scaling
 */
export function getTrajectoryBounds(trajectory: TrajectoryPoint[]) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const point of trajectory) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }

  return { minX, maxX, minY, maxY };
}
