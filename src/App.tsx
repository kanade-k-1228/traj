import { useAtom, useSetAtom } from "jotai";
import { Bookmark, Car, Download, RotateCcw, Upload } from "lucide-react";
import { useEffect } from "react";
import { Graph } from "@/components/Graph";
import { TrajectoryPlot } from "@/components/TrajectoryPlot";
import {
  useExport,
  useImport,
  useInitialize,
  useSetGroundTruth,
} from "@/logic/initialize";
import { methodAtom, syncOutputDataAtom } from "@/state/traj";
import {
  INPUT_GRAPH,
  type InputData,
  METHODS,
  type Methods,
  OUTPUT_GRAPH,
  type OutputKeys,
} from "@/type/trajectory";

export const App = () => {
  const handleExport = useExport();
  const handleImport = useImport();
  const handleInitialize = useInitialize();
  const handleSetGroundTruth = useSetGroundTruth();
  const [calculationMode, setCalculationMode] = useAtom(methodAtom);
  const syncOutputData = useSetAtom(syncOutputDataAtom);

  // Sync output data when calculation mode or input data changes
  useEffect(() => {
    syncOutputData();
  }, [syncOutputData]);

  const method = METHODS[calculationMode];
  const activeInputs = new Set(method?.inputs || []);

  return (
    <div className="min-h-screen bg-gray-950 p-2">
      <div className="max-w-[1800px] mx-auto">
        {/* Header */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-2 mb-2">
          <div className="flex items-center justify-between gap-4">
            {/* Left: Title */}
            <div className="flex items-center gap-2 min-w-[200px]">
              <Car size={24} className="text-purple-400" />
              <div>
                <h1 className="text-lg font-bold text-gray-100">
                  Trajectory Simulator
                </h1>
              </div>
            </div>

            {/* Center: Calculation Mode Selection */}
            <div className="flex items-center gap-2 flex-1 justify-center">
              {Object.entries(METHODS).map(([modeId, mode]) => (
                <button
                  key={modeId}
                  type="button"
                  onClick={() => setCalculationMode(modeId as Methods)}
                  className={`
                    px-2.5 py-1.5 rounded-lg border-2 transition-all text-xs font-medium
                    ${
                      calculationMode === modeId
                        ? "border-blue-500 bg-blue-950/50 text-blue-300"
                        : "border-gray-700 bg-gray-800 text-gray-300 hover:border-blue-500/50 hover:bg-gray-750"
                    }
                  `}
                  title={mode.description}
                >
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: mode.color }}
                    />
                    {mode.name}
                  </div>
                </button>
              ))}
            </div>

            {/* Right: Action Buttons */}
            <div className="flex items-center gap-2 min-w-[280px] justify-end">
              <button
                type="button"
                onClick={handleInitialize}
                className="bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 font-medium py-1.5 px-2.5 rounded-lg transition-colors flex items-center gap-1.5 text-xs"
                title="Reset to default trajectory"
              >
                <RotateCcw size={14} />
                初期化
              </button>
              <button
                type="button"
                onClick={handleSetGroundTruth}
                className="bg-green-700 hover:bg-green-600 text-white border border-green-600 font-medium py-1.5 px-2.5 rounded-lg transition-colors flex items-center gap-1.5 text-xs"
                title="Set current data as ground truth"
              >
                <Bookmark size={14} />
                Set as GT
              </button>
              <button
                type="button"
                onClick={handleImport}
                className="bg-blue-600 hover:bg-blue-700 text-white border border-blue-500 font-medium py-1.5 px-2.5 rounded-lg transition-colors flex items-center gap-1.5 text-xs"
                title="Import trajectory data from JSON"
              >
                <Upload size={14} />
                インポート
              </button>
              <button
                type="button"
                onClick={handleExport}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium py-1.5 px-2.5 rounded-lg transition-all flex items-center gap-1.5 shadow-md text-xs"
                title="Export trajectory data to JSON"
              >
                <Download size={14} />
                エクスポート
              </button>
            </div>
          </div>
        </div>

        {/* Main Content - 3 Column Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-2">
          {/* Left Column - Editable Trajectory Data */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 shadow-xl">
            <h2 className="text-md font-semibold text-gray-100 mb-2 flex items-center gap-2">
              📊 Input
            </h2>
            <div className="space-y-2">
              {Object.entries(INPUT_GRAPH).map(([id, config]) => (
                <Graph
                  key={id}
                  id={id as keyof InputData}
                  config={config}
                  isActive={activeInputs.has(id as keyof InputData)}
                  isEditable
                />
              ))}
            </div>
          </div>

          {/* Middle Column - Trajectory Plot */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 shadow-xl">
            <h2 className="text-md font-semibold text-gray-100 mb-2 flex items-center gap-2">
              🗺️ Plot
            </h2>
            <div className="h-[calc(100vh-180px)] min-h-[400px]">
              <TrajectoryPlot />
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-4 text-xs mt-2">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-gray-400">開始点</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span className="text-gray-400">終了点</span>
              </div>
            </div>
          </div>

          {/* Right Column - Output Data */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 shadow-xl">
            <h2 className="text-md font-semibold text-gray-100 mb-2 flex items-center gap-2">
              📈 Output
            </h2>
            <div className="space-y-2">
              {Object.entries(OUTPUT_GRAPH).map(([id, config]) => (
                <Graph key={id} id={id as OutputKeys} config={config} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
