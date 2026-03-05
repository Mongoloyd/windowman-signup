/**
 * compareAnchors.ts
 * Deterministic anchor ID map for evidence linking in compare view.
 * Smooth scroll + highlight destination section for 2 seconds.
 */

export const COMPARE_ANCHORS: Record<string, string> = {
  "#scope-permits": "#scope-permits",
  "#fineprint-cancellation": "#fineprint-cancellation",
  "#price-deposit": "#price-deposit",
  "#fineprint-lienwaiver": "#fineprint-lienwaiver",
  "#fineprint-arbitration": "#fineprint-arbitration",
  "#warranty-labor": "#warranty-labor",
  "#scope-inspection": "#scope-inspection",
  "#scope-debris": "#scope-debris",
  "#findings": "#findings",
};

/**
 * Scroll to an anchor and highlight it for 2 seconds.
 * Falls back to #findings if anchor not found.
 */
export function scrollToAnchor(anchor: string): void {
  const targetId = anchor.replace("#", "");
  let el = document.getElementById(targetId);

  // Fallback to #findings if not found
  if (!el) {
    el = document.getElementById("findings");
  }

  if (!el) return;

  el.scrollIntoView({ behavior: "smooth", block: "start" });

  // Highlight for 2 seconds
  el.classList.add("anchor-highlight");
  setTimeout(() => {
    el?.classList.remove("anchor-highlight");
  }, 2000);
}
