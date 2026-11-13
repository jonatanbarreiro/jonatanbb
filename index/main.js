// on a local checkout, follow the nodes to the sibling sources instead of the live sites
if (location.protocol === "file:")
  for (const node of document.querySelectorAll("a[data-local]"))
    node.setAttribute("href", node.dataset.local);
