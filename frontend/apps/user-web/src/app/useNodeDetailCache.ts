import { useEffect, useMemo, useRef, useState } from "react";

import { AuthApi, NotebookNodeDetail, NotebookTree } from "@notesheep/api-client";

type NodeDetailCacheState = {
  details: Map<string, NotebookNodeDetail>;
  notebookName: string;
};

type UseNodeDetailCacheOptions = {
  authApi: AuthApi;
  selectedNotebookName: string;
  tree: NotebookTree;
};

export type NodeDetailCache = ReadonlyMap<string, NotebookNodeDetail>;

export function useNodeDetailCache({ authApi, selectedNotebookName, tree }: UseNodeDetailCacheOptions): NodeDetailCache {
  const activeNodeIds = useMemo(() => activeCanvasNodeIds(tree), [tree]);
  const activeNodeKey = activeNodeIds.join("|");
  const cacheRef = useRef<NodeDetailCacheState>({ details: new Map(), notebookName: "" });
  const [details, setDetails] = useState<Map<string, NotebookNodeDetail>>(new Map());

  useEffect(() => {
    let cancelled = false;
    const wantedNodeIds = new Set(activeNodeIds);

    if (!selectedNotebookName) {
      cacheRef.current = { details: new Map(), notebookName: "" };
      setDetails(new Map());
      return () => {
        cancelled = true;
      };
    }

    const current = cacheRef.current.notebookName === selectedNotebookName ? cacheRef.current.details : new Map();
    const retained = new Map([...current].filter(([nodeId]) => wantedNodeIds.has(nodeId)));
    cacheRef.current = { details: retained, notebookName: selectedNotebookName };
    setDetails(new Map(retained));

    for (const nodeId of activeNodeIds) {
      if (retained.has(nodeId)) {
        continue;
      }
      authApi
        .getNodeDetail(selectedNotebookName, nodeId)
        .then((response) => {
          if (cancelled) {
            return;
          }
          const latest = cacheRef.current;
          if (latest.notebookName !== selectedNotebookName || !wantedNodeIds.has(nodeId)) {
            return;
          }
          const updated = new Map(latest.details).set(nodeId, response.detail);
          cacheRef.current = { details: updated, notebookName: selectedNotebookName };
          setDetails(new Map(updated));
        })
        .catch(() => undefined);
    }

    return () => {
      cancelled = true;
    };
  }, [activeNodeKey, authApi, selectedNotebookName]);

  return details;
}

function activeCanvasNodeIds(tree: NotebookTree) {
  const inactiveNodeIds = new Set([...(tree.freeNodeIds ?? []), ...(tree.deletedNodeIds ?? [])]);
  return tree.nodes.map((node) => node.id).filter((nodeId) => !inactiveNodeIds.has(nodeId));
}
