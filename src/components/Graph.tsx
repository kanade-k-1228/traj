import { useAtom, useAtomValue, useSetAtom } from "jotai";
import type React from "react";
import { type FC, useCallback, useEffect, useRef, useState } from "react";
import {
  batchUpdateTimeSeriesAtom,
  completeTrajectoryDataAtom,
  type DataKey,
  inputDataAtomFamily,
  outputDataAtomFamily,
} from "@/state/traj";
import type { GraphConfig, InputData, OutputData } from "@/type/trajectory";

export const Graph: FC<{
  id: DataKey;
  config: GraphConfig;
  isActive?: boolean;
  isEditable?: boolean;
}> = ({ id, config, isActive = false, isEditable = false }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Check if it's an output key to use the correct atom family
  const isOutputKey = ["ax", "ay", "cz", "l1"].includes(id);

  // Get data from appropriate source
  const completeData = useAtomValue(completeTrajectoryDataAtom);

  // Read output data atoms (always read to keep hook call order consistent)
  const axData = useAtomValue(outputDataAtomFamily("ax"));
  const ayData = useAtomValue(outputDataAtomFamily("ay"));
  const czData = useAtomValue(outputDataAtomFamily("cz"));
  const l1Data = useAtomValue(outputDataAtomFamily("l1"));

  // For non-active graphs, read from calculated/stored data
  const calculatedData = isOutputKey
    ? id === "ax"
      ? axData
      : id === "ay"
        ? ayData
        : id === "cz"
          ? czData
          : l1Data
    : id in completeData
      ? completeData[id as keyof InputData]
      : [];

  // For active graphs, read from editable atom
  const [editableInputData] = useAtom(
    isOutputKey
      ? outputDataAtomFamily(id as keyof OutputData)
      : inputDataAtomFamily(id as keyof InputData),
  );

  // Use calculated data when not active, editable data when active
  const data = isActive ? editableInputData : calculatedData;

  const batchUpdateTimeSeries = useSetAtom(batchUpdateTimeSeriesAtom);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastUpdatedIndex, setLastUpdatedIndex] = useState<number | null>(null);
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

  // Helper functions
  const valueToY = useCallback(
    (value: number) => {
      const range = config.maxVal - config.minVal;
      return ((config.maxVal - value) / range) * dimensions.height;
    },
    [config.maxVal, config.minVal, dimensions.height],
  );

  const yToValue = useCallback(
    (y: number) => {
      const range = config.maxVal - config.minVal;
      return config.maxVal - (y / dimensions.height) * range;
    },
    [config.maxVal, config.minVal, dimensions.height],
  );

  const getIndexFromX = useCallback(
    (x: number) => {
      const stepWidth = dimensions.width / data.length;
      const index = Math.floor(x / stepWidth);
      return Math.max(0, Math.min(data.length - 1, index));
    },
    [data.length, dimensions.width],
  );

  const interpolateValues = useCallback(
    (
      startIndex: number,
      endIndex: number,
      startValue: number,
      endValue: number,
    ) => {
      const updates: Array<{ index: number; value: number }> = [];
      const indexDiff = Math.abs(endIndex - startIndex);

      if (indexDiff <= 1) {
        return updates;
      }

      const minIndex = Math.min(startIndex, endIndex);
      const maxIndex = Math.max(startIndex, endIndex);

      for (let i = minIndex + 1; i < maxIndex; i++) {
        const t = (i - startIndex) / (endIndex - startIndex);
        const value = startValue + (endValue - startValue) * t;
        updates.push({
          index: i,
          value: Math.max(config.minVal, Math.min(config.maxVal, value)),
        });
      }

      return updates;
    },
    [config.minVal, config.maxVal],
  );

  // Event handlers (only used when isActive and isEditable)
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isActive || !isEditable) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const index = getIndexFromX(x);
      const value = yToValue(y);
      const clampedValue = Math.max(
        config.minVal,
        Math.min(config.maxVal, value),
      );

      batchUpdateTimeSeries({
        key: id,
        updates: [{ index, value: clampedValue }],
      });

      setIsDrawing(true);
      setLastUpdatedIndex(index);
      canvas.style.cursor = "crosshair";
    },
    [
      isActive,
      isEditable,
      getIndexFromX,
      yToValue,
      batchUpdateTimeSeries,
      id,
      config.minVal,
      config.maxVal,
    ],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isActive || !isEditable) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (isDrawing) {
        const currentIndex = getIndexFromX(x);
        const currentValue = yToValue(y);
        const clampedValue = Math.max(
          config.minVal,
          Math.min(config.maxVal, currentValue),
        );

        const updates = [{ index: currentIndex, value: clampedValue }];

        // 補間処理：前回の更新位置から現在位置までの中間点も更新
        if (lastUpdatedIndex !== null && lastUpdatedIndex !== currentIndex) {
          const lastValue = data[lastUpdatedIndex];
          const interpolatedValues = interpolateValues(
            lastUpdatedIndex,
            currentIndex,
            lastValue,
            clampedValue,
          );
          updates.push(...interpolatedValues);
        }

        // バッチ更新
        batchUpdateTimeSeries({
          key: id,
          updates,
        });

        setLastUpdatedIndex(currentIndex);
      }
    },
    [
      isActive,
      isEditable,
      isDrawing,
      lastUpdatedIndex,
      getIndexFromX,
      yToValue,
      batchUpdateTimeSeries,
      id,
      config.minVal,
      config.maxVal,
      interpolateValues,
      data,
    ],
  );

  const handleMouseUp = useCallback(() => {
    if (!isActive || !isEditable) return;

    setIsDrawing(false);
    setLastUpdatedIndex(null);
    if (canvasRef.current) {
      canvasRef.current.style.cursor = "crosshair";
    }
  }, [isActive, isEditable]);

  // Draw graph
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, dimensions.width, dimensions.height);

    // Draw grid
    ctx.strokeStyle = "#374151";
    ctx.lineWidth = 1;

    // Vertical grid lines
    const stepWidth = dimensions.width / data.length;
    for (let i = 0; i <= data.length; i += 5) {
      const x = i * stepWidth;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, dimensions.height);
      ctx.stroke();
    }

    // Horizontal grid lines (at 0 if in range)
    if (config.minVal < 0 && config.maxVal > 0) {
      ctx.strokeStyle = "#6b7280";
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      const zeroY = valueToY(0);
      ctx.moveTo(0, zeroY);
      ctx.lineTo(dimensions.width, zeroY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw data line
    ctx.strokeStyle = config.color;
    ctx.lineWidth = 2;
    ctx.beginPath();

    for (let i = 0; i < data.length; i++) {
      const x = (i + 0.5) * stepWidth;
      const y = valueToY(data[i]);

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    // Draw points
    ctx.fillStyle = config.color;
    const pointSize = isActive && isEditable ? 3 : 2;
    for (let i = 0; i < data.length; i++) {
      const x = (i + 0.5) * stepWidth;
      const y = valueToY(data[i]);

      ctx.beginPath();
      ctx.arc(x, y, pointSize, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [data, config, dimensions, valueToY, isActive, isEditable]);

  return (
    <div
      className={`${
        isActive
          ? "bg-blue-900/30 border-blue-700"
          : "bg-gray-800 border-gray-700"
      } border rounded-lg p-2 shadow-sm`}
    >
      <div className="flex items-center gap-2">
        <div className="flex flex-col items-center justify-center min-w-10">
          <h3 className="text-sm font-medium text-gray-300">{config.label}</h3>
          <span className="text-xs text-gray-400">[{config.unit}]</span>
        </div>
        <canvas
          ref={canvasRef}
          className={`flex-1 h-24 border border-gray-700 rounded bg-gray-900 ${
            isActive && isEditable ? "cursor-crosshair" : ""
          }`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      </div>
    </div>
  );
};
