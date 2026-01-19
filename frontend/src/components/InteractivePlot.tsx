import React from "react";
import Plot from "react-plotly.js";

interface InteractivePlotProps {
  data: any; // JSON string or object from backend
}

export const InteractivePlot: React.FC<InteractivePlotProps> = ({ data }) => {
  if (!data) return null;

  let plotData;
  let layout;

  try {
    const parsed = typeof data === "string" ? JSON.parse(data) : data;
    plotData = parsed.data;
    layout = parsed.layout;
  } catch (e) {
    return <div className="text-red-500 text-xs">Failed to render plot</div>;
  }

  return (
    <div className="w-full h-80 bg-white rounded-lg overflow-hidden my-2 border border-gray-700">
      <Plot
        data={plotData}
        layout={{
          ...layout,
          autosize: true,
          margin: { l: 40, r: 20, t: 30, b: 40 },
          paper_bgcolor: "rgba(0,0,0,0)",
        }}
        useResizeHandler={true}
        style={{ width: "100%", height: "100%" }}
        config={{ responsive: true, displayModeBar: true }}
      />
    </div>
  );
};
