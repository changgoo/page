/**
 * Simple bibliography sorting: Sort by Year | Sort by Citation
 * Container is .publications (the div that wraps the bibliography output).
 */

(function () {
  "use strict";

  let currentSort = "year-desc";
  let originalHTML = null;

  function init() {
    const yearBtn = document.getElementById("sort-by-year");
    const citationBtn = document.getElementById("sort-by-citation");
    if (!yearBtn || !citationBtn) return;

    // Must be the div that wraps h2 + ol groups (Jekyll-Scholar output)
    const container = document.querySelector(".publications");
    if (!container) return;

    if (originalHTML === null) {
      originalHTML = container.innerHTML;
    }

    function getCitationCount(li) {
      // Use data-citations from template (from bib ads_citations / bibgen.py, or Google Scholar)
      const dataEl = li.querySelector("[data-citations]");
      if (dataEl) {
        const n = parseInt(dataEl.getAttribute("data-citations"), 10);
        if (!isNaN(n)) return n;
      }
      // Fallback: parse from badge img alt or src
      let maxCount = 0;
      const imgs = li.querySelectorAll(".badges img, .badges a img");
      imgs.forEach(function (img) {
        const alt = (img.getAttribute("alt") || "").trim();
        const src = (img.getAttribute("src") || "").trim();
        const fromAlt = alt.match(/(\d+(?:\.\d+)?)\s*(K|M|B)?\s*(?:Google Scholar|InspireHEP)?\s*citations?/i);
        if (fromAlt) {
          let n = parseFloat(fromAlt[1]);
          if (fromAlt[2] === "K" || fromAlt[2] === "k") n *= 1000;
          else if (fromAlt[2] === "M" || fromAlt[2] === "m") n *= 1000000;
          else if (fromAlt[2] === "B" || fromAlt[2] === "b") n *= 1000000000;
          maxCount = Math.max(maxCount, n);
        }
        const fromSrc = src.match(/scholar-(\d+(?:\.\d+)?)([KMB])?-4285F4/);
        if (fromSrc) {
          let n2 = parseFloat(fromSrc[1]);
          if (fromSrc[2] === "K") n2 *= 1000;
          else if (fromSrc[2] === "M") n2 *= 1000000;
          else if (fromSrc[2] === "B") n2 *= 1000000000;
          maxCount = Math.max(maxCount, n2);
        }
      });
      return maxCount;
    }

    function getYear(li) {
      const periodicals = li.querySelectorAll(".periodical");
      let text = "";
      periodicals.forEach(function (p) {
        text += p.textContent;
      });
      const m = text.match(/\b(19|20)\d{2}\b/);
      return m ? parseInt(m[0], 10) : 0;
    }

    function getAllEntries() {
      container.innerHTML = originalHTML;

      const entries = [];
      const h2s = container.querySelectorAll("h2.bibliography");

      if (h2s.length === 0) {
        // No year groups: single flat ol
        const ol = container.querySelector("ol.bibliography, ol");
        if (ol) {
          const items = ol.querySelectorAll(":scope > li");
          items.forEach(function (li) {
            entries.push({
              element: li.cloneNode(true),
              year: getYear(li),
              citations: getCitationCount(li),
              yearHeader: null,
            });
          });
        }
        return entries;
      }

      h2s.forEach(function (h2) {
        const groupYear = parseInt(h2.textContent.trim(), 10) || 0;
        let next = h2.nextElementSibling;
        while (next && next.tagName !== "H2") {
          if (next.tagName === "OL") {
            const items = next.querySelectorAll(":scope > li");
            items.forEach(function (li) {
              const y = getYear(li) || groupYear;
              entries.push({
                element: li.cloneNode(true),
                year: y,
                citations: getCitationCount(li),
                yearHeader: h2.cloneNode(true),
              });
            });
          }
          next = next.nextElementSibling;
        }
      });

      return entries;
    }

    function applySortByYear() {
      const entries = getAllEntries();
      const desc = currentSort === "year-desc";

      entries.sort(function (a, b) {
        return desc ? b.year - a.year : a.year - b.year;
      });

      const yearMap = new Map();
      entries.forEach(function (entry) {
        if (!yearMap.has(entry.year)) {
          yearMap.set(entry.year, {
            year: entry.year,
            header: entry.yearHeader,
            entries: [],
          });
        }
        yearMap.get(entry.year).entries.push(entry);
      });

      const sortedYears = Array.from(yearMap.values()).sort(function (a, b) {
        return desc ? b.year - a.year : a.year - b.year;
      });

      container.innerHTML = "";
      sortedYears.forEach(function (group) {
        if (group.header) {
          container.appendChild(group.header);
        }
        const ol = document.createElement("ol");
        ol.className = "bibliography";
        group.entries.forEach(function (e) {
          ol.appendChild(e.element);
        });
        container.appendChild(ol);
      });

      currentSort = desc ? "year-asc" : "year-desc";
      yearBtn.textContent = desc ? "Year (Oldest First)" : "Year (Newest First)";
    }

    function applySortByCitation() {
      const entries = getAllEntries();
      entries.sort(function (a, b) {
        return b.citations - a.citations;
      });

      container.innerHTML = "";
      const ol = document.createElement("ol");
      ol.className = "bibliography";
      entries.forEach(function (e) {
        ol.appendChild(e.element);
      });
      container.appendChild(ol);

      citationBtn.textContent = "Sorted by Citation";
    }

    yearBtn.addEventListener("click", applySortByYear);
    citationBtn.addEventListener("click", applySortByCitation);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
