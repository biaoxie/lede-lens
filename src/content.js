(() => {
  const ATTRIBUTE = "data-ledelens-paragraph-id";
  const MAX_PARAGRAPHS = 250;
  const MAX_CHARACTERS = 120_000;

  function cleanText(value) {
    return (value || "").replace(/\s+/g, " ").trim();
  }

  function isVisible(element) {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
  }

  function rootScore(root) {
    const paragraphs = [...root.querySelectorAll("p")].filter(isVisible);
    const textLength = paragraphs.reduce((total, paragraph) => total + cleanText(paragraph.innerText).length, 0);
    return textLength + paragraphs.length * 80;
  }

  function findArticleRoot() {
    const candidates = [...document.querySelectorAll("article, main, [role='main']")];
    if (!candidates.length) return document.body;
    return candidates.sort((left, right) => rootScore(right) - rootScore(left))[0];
  }

  function getMeta(selectors, attribute = "content") {
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      const value = cleanText(element?.getAttribute(attribute) || element?.innerText);
      if (value) return value;
    }
    return null;
  }

  function selectedTextForElement(range, element) {
    const elementRange = document.createRange();
    elementRange.selectNodeContents(element);
    const intersection = range.cloneRange();
    if (intersection.compareBoundaryPoints(Range.START_TO_START, elementRange) < 0) {
      intersection.setStart(elementRange.startContainer, elementRange.startOffset);
    }
    if (intersection.compareBoundaryPoints(Range.END_TO_END, elementRange) > 0) {
      intersection.setEnd(elementRange.endContainer, elementRange.endOffset);
    }
    return cleanText(intersection.toString());
  }

  function collectElements(root, selectionOnly) {
    const selection = window.getSelection();
    const range = selectionOnly && selection?.rangeCount ? selection.getRangeAt(0) : null;
    const selector = "p, blockquote, li";
    const elements = [
      ...(root.matches?.(selector) ? [root] : []),
      ...root.querySelectorAll(selector),
    ];
    const seen = new Set();

    return elements.filter((element) => {
      if (!isVisible(element)) return false;
      if (range && !range.intersectsNode(element)) return false;
      if (element.closest("nav, aside, footer, form, [aria-hidden='true']")) return false;

      const text = range ? selectedTextForElement(range, element) : cleanText(element.innerText);
      if (text.length < 40 || seen.has(text)) return false;
      seen.add(text);
      return true;
    });
  }

  function extract(mode = "article") {
    document.querySelectorAll(`[${ATTRIBUTE}]`).forEach((element) => element.removeAttribute(ATTRIBUTE));

    const selectionOnly = mode === "selection";
    const selection = cleanText(window.getSelection()?.toString());
    if (selectionOnly && !selection) {
      throw new Error("Select text on the page before using selection mode.");
    }

    const root = selectionOnly
      ? window.getSelection().getRangeAt(0).commonAncestorContainer.parentElement || document.body
      : findArticleRoot();
    const elements = collectElements(root, selectionOnly);
    const selectionRange = selectionOnly ? window.getSelection().getRangeAt(0) : null;
    const paragraphs = [];
    const notes = [];
    let characterCount = 0;

    for (const element of elements) {
      const text = selectionRange
        ? selectedTextForElement(selectionRange, element)
        : cleanText(element.innerText);
      if (paragraphs.length >= MAX_PARAGRAPHS || characterCount + text.length > MAX_CHARACTERS) {
        notes.push("The extract was truncated to fit the extension's local size limit.");
        break;
      }
      const id = `p${paragraphs.length + 1}`;
      element.setAttribute(ATTRIBUTE, id);
      paragraphs.push({ id, text });
      characterCount += text.length;
    }

    if (!selectionOnly && root === document.body) {
      notes.push("No semantic article container was found; the main page body was used.");
    }
    if (selectionOnly) {
      notes.push("Only the user's selected text was analyzed.");
    }
    if (paragraphs.length < 3) {
      notes.push("Very little article text was detected; the analysis may be incomplete.");
    }

    return {
      requested_language: "match_article",
      title: cleanText(document.querySelector("h1")?.innerText) || cleanText(document.title) || "Untitled article",
      url: location.href,
      byline: getMeta([
        "meta[name='author']",
        "[rel='author']",
        "[class*='byline' i]",
        "[class*='author' i]",
      ]),
      published_at: getMeta([
        "meta[property='article:published_time']",
        "meta[name='date']",
        "time[datetime]",
      ]),
      extraction: {
        status: notes.length ? "partial" : "complete",
        notes,
      },
      paragraphs,
    };
  }

  function highlight(paragraphId) {
    const element = document.querySelector(`[${ATTRIBUTE}="${CSS.escape(paragraphId)}"]`);
    if (!element) return false;

    element.scrollIntoView({ behavior: "smooth", block: "center" });
    const previousOutline = element.style.outline;
    const previousOffset = element.style.outlineOffset;
    element.style.outline = "3px solid #d97706";
    element.style.outlineOffset = "4px";
    setTimeout(() => {
      element.style.outline = previousOutline;
      element.style.outlineOffset = previousOffset;
    }, 2400);
    return true;
  }

  globalThis.__ledeLens = { extract, highlight };
})();
