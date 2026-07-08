# The crack model — "final graph + self-similar cracks"

Jonatan's design for the site's cracks (introduced iteration 23). This is the
authoritative spec; the implementation lives in `main.js` (`triangulate` → `buildGraph`
→ `placeCracks` → `drawCracks`). Two ideas: a **directed graph** that flows from the top
of the page to the bottom, and a **self-similar** rule that makes every crack a small copy
of that whole graph.

## Anchors and the point field

- **`I`** — the top anchor, the tittle of the `i` in "Barreiro" (the hero name). It is also
  the pulse root: cracks "arise from `I`".
- **`i`** — the bottom anchor, the tittle of the `i` in the contact head ("get in touch";
  located live, falling back to the head's centre when the language has no i/j).
- The blue-noise sample field is restricted to lie strictly **between** `I` and `i` in y
  (no point above `I`, none below `i`).

## The final graph

1. **Delaunay** triangulate the in-band dots (the logo-centre dot is not a crack node), then
   **prune**: drop every perimeter side, and drop each triangle's longest side when it exceeds
   twice its shortest.
2. The **spine** is the shortest path `I → i` over the pruned graph (edge weight = length). If
   pruning has split the field so the two are unreachable, fall back to the full Delaunay
   (always connected).
3. Grow the rest of the **final graph** from the spine. Traverse the spine from `i` upward; at
   each spine node, with the local flow direction (the way the crack is heading), admit any
   pruned edge to a **not-yet-taken** node whose direction turns **≤ π/4** from the flow, then
   recurse from that node with its own new direction. Then, at `I`, adopt its nearest remaining
   neighbours (closest first, that first edge unconstrained) and grow from each the same way.
4. Any point still loose attaches to its nearest already-in node that is **closer to `I`**
   ("uphill"). This keeps the graph a single piece that the pulse can reveal as a connected
   front (stopping the pulse at any moment shows a connected sub-graph — true because the spine
   is straight enough; taken on faith, not proved).

Every edge is **oriented** parent → child with the parent closer to `I`, so the whole thing
reads as arising from `I` and running down onto `i`. The result is a spanning tree over the
in-band points.

## Self-similar cracks

Each edge of the final graph is drawn as a **scaled copy of the entire final graph** — the part
contains the whole (a depth-1 fractal). To place the copy on an edge:

1. Normalise the graph once: translate so `i` is at the origin, rotate so `I` sits on the
   positive x-axis, scale x so `I` lands at `x = 1`, scale y so the largest `|y|` equals **`t`**.
2. Map that normalised graph onto the edge with `I → parent`, `i → child`: x runs along the
   edge (scaled by its length), y stays absolute (± `t` px perpendicular). So the crack keeps
   the parent → child orientation and never strays more than `t` from the straight segment —
   large-scale it still reads as a straight line between the two points.

**`t`** (crack half-thickness) is the one real knob; a good value is ~half the hero name's
letter height (so `2t` ≈ its caps). The pulse reveals each crack by distance from `I`, so the
copy's `I`-side (the parent) lights first.

## Movable points, static graph

The graph **topology** is built once (load / resize), never on a drag — that dynamic rebuild
was the old lag. Dragging a point moves its node; `placeCracks` re-lays the cracks from the
fixed topology (arithmetic only). Making the topology itself follow a drag is a deliberate
*later* experiment, to be tried only once the optimised version proves it stays responsive.

## Open threads / variations

- **Deeper fractal**: recurse the replication (each stick becomes a mini-graph) for depth 2+.
  Cost grows as `edges^depth`; depth 1 is the chosen default.
- **Periodic band** instead of x-rescaling: tile the normalised graph along x to fill a long
  edge (landing cleanly on both endpoints), so long cracks don't look stretched.
- **Segmentation-guided placement**: use the page segmentation (iteration ~20) to steer point
  and crack placement clear of the segmented text.
