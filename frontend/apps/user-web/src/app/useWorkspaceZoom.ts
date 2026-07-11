import { useEffect, useRef, useState } from "react";

const MIN_WORKSPACE_ZOOM = 0.5;
const MAX_WORKSPACE_ZOOM = 2;
export const WORKSPACE_ZOOM_STEP = 0.1;

export function useWorkspaceZoom() {
  const treeBoardRef = useRef<HTMLDivElement | null>(null);
  const [workspaceZoom, setWorkspaceZoom] = useState(1);

  function updateWorkspaceZoom(delta: number) {
    setWorkspaceZoom((currentZoom) => clampZoom(currentZoom + delta));
  }

  function resetWorkspaceZoom() {
    setWorkspaceZoom(1);
  }

  useEffect(() => {
    const element = treeBoardRef.current;
    if (!element) {
      return undefined;
    }

    function handleTreeBoardWheel(event: globalThis.WheelEvent) {
      if (event.deltaY === 0) {
        return;
      }
      event.preventDefault();
      setWorkspaceZoom((currentZoom) =>
        clampZoom(currentZoom + (event.deltaY < 0 ? WORKSPACE_ZOOM_STEP : -WORKSPACE_ZOOM_STEP)),
      );
    }

    element.addEventListener("wheel", handleTreeBoardWheel, { passive: false });
    return () => {
      element.removeEventListener("wheel", handleTreeBoardWheel);
    };
  }, []);

  return {
    canZoomIn: workspaceZoom < MAX_WORKSPACE_ZOOM,
    canZoomOut: workspaceZoom > MIN_WORKSPACE_ZOOM,
    resetWorkspaceZoom,
    treeBoardRef,
    updateWorkspaceZoom,
    workspaceZoom,
  };
}

export function formatZoom(value: number) {
  return `${Math.round(value * 100)}%`;
}

function clampZoom(value: number) {
  return Math.round(Math.min(Math.max(value, MIN_WORKSPACE_ZOOM), MAX_WORKSPACE_ZOOM) * 10) / 10;
}
