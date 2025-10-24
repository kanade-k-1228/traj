import { useAtomValue } from "jotai";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import {
  completeTrajectoryDataAtom,
  gtDataAtom,
  hasGroundTruthAtom,
} from "@/state/traj";
import type { TrajectoryPoint } from "@/type/trajectory";
import { CONFIG } from "@/type/trajectory";
import { calculateTrajectory, getTrajectoryBounds } from "@/utils/trajectory";

export const TrajectoryPlot: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const trajectoryData = useAtomValue(completeTrajectoryDataAtom);
  const gtData = useAtomValue(gtDataAtom);
  const hasGroundTruth = useAtomValue(hasGroundTruthAtom);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Update canvas dimensions
  useEffect(() => {
    const updateDimensions = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        setDimensions({ width: rect.width, height: rect.height });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  // Draw trajectory
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Calculate trajectory points
    const trajectory = calculateTrajectory(trajectoryData);
    const gtTrajectory = hasGroundTruth ? calculateTrajectory(gtData) : null;

    // Calculate bounds considering both trajectories
    const allPoints = gtTrajectory
      ? [...trajectory, ...gtTrajectory]
      : trajectory;
    const bounds = getTrajectoryBounds(allPoints);

    // Clear canvas
    ctx.clearRect(0, 0, dimensions.width, dimensions.height);

    // Calculate scaling
    const padding = 40;
    const rangeX = bounds.maxX - bounds.minX || 10;
    const rangeY = bounds.maxY - bounds.minY || 10;

    const scaleX = (dimensions.width - 2 * padding) / rangeX;
    const scaleY = (dimensions.height - 2 * padding) / rangeY;
    const scale = Math.min(scaleX, scaleY) * 0.9;

    // Place origin at center bottom
    const offsetX = dimensions.width / 2;
    const offsetY = 0;

    // Draw grid (with rotated coordinates)
    drawGrid(ctx, dimensions, scale, offsetX, offsetY);

    // Draw axes (rotated: x-axis vertical pointing up, y-axis horizontal pointing left)
    ctx.strokeStyle = "#9ca3af";
    ctx.lineWidth = 1.5;

    // X-axis (now vertical, pointing up)
    ctx.beginPath();
    ctx.moveTo(offsetX, 0);
    ctx.lineTo(offsetX, dimensions.height);
    ctx.stroke();

    // Y-axis (now horizontal, pointing left)
    ctx.beginPath();
    ctx.moveTo(0, dimensions.height - offsetY);
    ctx.lineTo(dimensions.width, dimensions.height - offsetY);
    ctx.stroke();

    // Draw ground truth trajectory first (if exists)
    if (gtTrajectory && gtTrajectory.length > 0) {
      drawTrajectoryPath(
        ctx,
        gtTrajectory,
        "#22c55e", // Green for GT
        3,
        scale,
        offsetX,
        offsetY,
        dimensions,
      );

      // Draw GT yaw indicators
      drawYawIndicators(
        ctx,
        gtTrajectory,
        "#86efac", // Light green
        2,
        12,
        3,
        scale,
        offsetX,
        offsetY,
        dimensions,
      );
    }

    // Draw current trajectory
    drawTrajectoryPath(
      ctx,
      trajectory,
      CONFIG.trajectoryColor, // Purple/blue for current
      3,
      scale,
      offsetX,
      offsetY,
      dimensions,
    );

    // Draw current trajectory yaw indicators
    drawYawIndicators(
      ctx,
      trajectory,
      "#fbbf24", // Amber
      2.5,
      15,
      3,
      scale,
      offsetX,
      offsetY,
      dimensions,
    );

    // Draw start and end points for current trajectory
    if (trajectory.length > 0) {
      // Start point (cyan)
      ctx.fillStyle = "#06b6d4";
      ctx.beginPath();
      const startX = trajectory[0].y * scale + offsetX;
      const startY = dimensions.height - (trajectory[0].x * scale + offsetY);
      ctx.arc(startX, startY, 6, 0, Math.PI * 2);
      ctx.fill();

      // Add "Start" label
      ctx.fillStyle = "#d1d5db";
      ctx.font = "12px sans-serif";
      ctx.fillText("Start", startX + 10, startY - 10);

      // End point (red)
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      const endX = trajectory[trajectory.length - 1].y * scale + offsetX;
      const endY =
        dimensions.height -
        (trajectory[trajectory.length - 1].x * scale + offsetY);
      ctx.arc(endX, endY, 6, 0, Math.PI * 2);
      ctx.fill();

      // Add "End" label
      ctx.fillStyle = "#d1d5db";
      ctx.fillText("End", endX + 10, endY - 10);
    }

    // Draw legend
    drawLegend(ctx, dimensions, hasGroundTruth);

    // Draw scale indicator
    ctx.fillStyle = "#9ca3af";
    ctx.font = "11px sans-serif";
    ctx.fillText(`Scale: 10m`, dimensions.width - 70, dimensions.height - 10);
  }, [trajectoryData, gtData, hasGroundTruth, dimensions]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full bg-gray-900 border border-gray-700 rounded-lg"
    />
  );
};

function drawGrid(
  ctx: CanvasRenderingContext2D,
  dimensions: { width: number; height: number },
  scale: number,
  offsetX: number,
  offsetY: number,
) {
  ctx.strokeStyle = "#374151";
  ctx.lineWidth = 0.5;

  const gridSpacing = 10; // meters

  // Vertical grid lines (for original y-axis, now horizontal)
  for (let y = -200; y <= 200; y += gridSpacing) {
    const screenX = y * scale + offsetX;
    if (screenX >= 0 && screenX <= dimensions.width) {
      ctx.beginPath();
      ctx.moveTo(screenX, 0);
      ctx.lineTo(screenX, dimensions.height);
      ctx.stroke();
    }
  }

  // Horizontal grid lines (for original x-axis, now vertical)
  for (let x = -200; x <= 200; x += gridSpacing) {
    const screenY = dimensions.height - (x * scale + offsetY);
    if (screenY >= 0 && screenY <= dimensions.height) {
      ctx.beginPath();
      ctx.moveTo(0, screenY);
      ctx.lineTo(dimensions.width, screenY);
      ctx.stroke();
    }
  }
}

function drawTrajectoryPath(
  ctx: CanvasRenderingContext2D,
  trajectory: TrajectoryPoint[],
  color: string,
  lineWidth: number,
  scale: number,
  offsetX: number,
  offsetY: number,
  dimensions: { width: number; height: number },
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();

  for (let i = 0; i < trajectory.length; i++) {
    const x = trajectory[i].y * scale + offsetX;
    const y = dimensions.height - (trajectory[i].x * scale + offsetY);

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.stroke();
}

function drawYawIndicators(
  ctx: CanvasRenderingContext2D,
  trajectory: TrajectoryPoint[],
  color: string,
  lineWidth: number,
  indicatorLength: number,
  skipInterval: number,
  scale: number,
  offsetX: number,
  offsetY: number,
  dimensions: { width: number; height: number },
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;

  for (let i = 0; i < trajectory.length; i += skipInterval) {
    const point = trajectory[i];
    const x = point.y * scale + offsetX;
    const y = dimensions.height - (point.x * scale + offsetY);
    const theta = point.theta ?? 0;

    const dx = Math.sin(theta) * indicatorLength;
    const dy = -Math.cos(theta) * indicatorLength;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + dx, y + dy);
    ctx.stroke();
  }
}

function drawLegend(
  ctx: CanvasRenderingContext2D,
  _dimensions: { width: number; height: number },
  hasGroundTruth: boolean,
) {
  const legendX = 10;
  const legendY = 10;
  const lineLength = 30;
  const lineSpacing = 20;

  ctx.font = "12px sans-serif";

  // Current trajectory
  ctx.strokeStyle = CONFIG.trajectoryColor;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(legendX, legendY);
  ctx.lineTo(legendX + lineLength, legendY);
  ctx.stroke();

  ctx.fillStyle = "#d1d5db";
  ctx.fillText("Current", legendX + lineLength + 8, legendY + 4);

  // Ground truth trajectory
  if (hasGroundTruth) {
    ctx.strokeStyle = "#22c55e";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(legendX, legendY + lineSpacing);
    ctx.lineTo(legendX + lineLength, legendY + lineSpacing);
    ctx.stroke();

    ctx.fillStyle = "#d1d5db";
    ctx.fillText(
      "Ground Truth",
      legendX + lineLength + 8,
      legendY + lineSpacing + 4,
    );
  }
}
