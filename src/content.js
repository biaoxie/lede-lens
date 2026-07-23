(() => {
  const ATTRIBUTE = "data-ledelens-paragraph-id";
  const SOURCE_ATTRIBUTE = "data-ledelens-source-id";
  const BLOCK_SELECTOR = "p, blockquote, pre, li";
  const MAX_PARAGRAPHS = 250;
  const MAX_CHARACTERS = 120_000;

  function cleanText(value) {
    return (value || "").replace(/\s+/g, " ").trim();
  }

  function pageUrlWithoutParameters() {
    const url = new URL(location.href);
    url.search = "";
    url.hash = "";
    return url.toString();
  }

  function isVisible(element) {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
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

  function sourceBlocks() {
    return [...document.querySelectorAll(BLOCK_SELECTOR)].filter((element) => {
      if (!isVisible(element)) return false;
      if (element.closest("nav, aside, footer, form, [aria-hidden='true']")) return false;
      return Boolean(cleanText(element.innerText));
    });
  }

  function markSourceBlocks() {
    document.querySelectorAll(`[${ATTRIBUTE}], [${SOURCE_ATTRIBUTE}]`).forEach((element) => {
      element.removeAttribute(ATTRIBUTE);
      element.removeAttribute(SOURCE_ATTRIBUTE);
    });

    const blocks = sourceBlocks();
    blocks.forEach((element, index) => element.setAttribute(SOURCE_ATTRIBUTE, `source-${index + 1}`));
    return blocks;
  }

  function parsedBlocks(content) {
    const primary = [...content.querySelectorAll("p, blockquote, pre")];
    const listItems = [...content.querySelectorAll("li")].filter(
      (element) => !element.querySelector("p, blockquote, pre"),
    );
    const blocks = [...primary, ...listItems].sort((left, right) => {
      if (left === right) return 0;
      return left.compareDocumentPosition(right) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
    });
    return blocks.filter((element) => Boolean(cleanText(element.textContent)));
  }

  function mapParsedBlocks(content, sources) {
    const sourcesById = new Map(sources.map((element) => [element.getAttribute(SOURCE_ATTRIBUTE), element]));
    const sourcesByText = new Map();

    for (const element of sources) {
      const text = cleanText(element.innerText);
      const matches = sourcesByText.get(text) || [];
      matches.push(element);
      sourcesByText.set(text, matches);
    }

    const mapped = parsedBlocks(content).map((parsedElement) => {
      const text = cleanText(parsedElement.textContent);
      const sourceId = parsedElement.getAttribute(SOURCE_ATTRIBUTE);
      const source = sourcesById.get(sourceId) || sourcesByText.get(text)?.shift() || null;
      return { source, text };
    });

    return coherentSourceSubtree(mapped);
  }

  function coherentSourceSubtree(blocks) {
    const linkedBlocks = blocks.filter(({ source }) => source);
    if (!linkedBlocks.length) return blocks;

    const candidates = new Set();
    for (const { source } of linkedBlocks) {
      for (let current = source; current && current !== document.documentElement; current = current.parentElement) {
        candidates.add(current);
      }
    }

    let bestRoot = document.body;
    let bestScore = -1;
    for (const candidate of candidates) {
      const matchedCharacters = linkedBlocks
        .filter(({ source }) => candidate.contains(source))
        .reduce((total, { text }) => total + text.length, 0);
      const candidateCharacters = Math.max(cleanText(candidate.innerText).length, matchedCharacters);
      const score = matchedCharacters * (matchedCharacters / Math.max(candidateCharacters, 1));
      if (score > bestScore) {
        bestScore = score;
        bestRoot = candidate;
      }
    }

    return blocks.filter(({ source }) => source && bestRoot.contains(source));
  }

  function collectSelection(range) {
    const commonAncestor = range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
      ? range.commonAncestorContainer
      : range.commonAncestorContainer.parentElement;
    const root = commonAncestor || document.body;
    const elements = [
      ...(root.matches?.(BLOCK_SELECTOR) ? [root] : []),
      ...root.querySelectorAll(BLOCK_SELECTOR),
    ];

    return elements
      .filter((element) => isVisible(element) && range.intersectsNode(element))
      .map((element) => ({ source: element, text: selectedTextForElement(range, element) }))
      .filter(({ text }) => Boolean(text));
  }

  function collectSemanticFallback(sources) {
    const root = document.querySelector("article, main, [role='main']");
    if (!root) return [];
    return sources
      .filter((element) => root.contains(element))
      .map((source) => ({ source, text: cleanText(source.innerText) }))
      .filter(({ text }) => Boolean(text));
  }

  function finalizeParagraphs(blocks, notes) {
    const paragraphs = [];
    let characterCount = 0;

    for (const { source, text } of blocks) {
      if (paragraphs.length >= MAX_PARAGRAPHS || characterCount + text.length > MAX_CHARACTERS) {
        notes.push("The extract was truncated to fit the extension's local size limit.");
        break;
      }
      const id = `p${paragraphs.length + 1}`;
      source?.setAttribute(ATTRIBUTE, id);
      paragraphs.push({ id, text });
      characterCount += text.length;
    }

    const unlinkedCount = blocks.slice(0, paragraphs.length).filter(({ source }) => !source).length;
    if (unlinkedCount) {
      notes.push(`${unlinkedCount} extracted paragraph(s) could not be linked back to the live page.`);
    }
    if (paragraphs.length < 3) {
      notes.push("Very little article text was detected; the analysis may be incomplete.");
    }
    return paragraphs;
  }

  function extract(mode = "article") {
    const selectionOnly = mode === "selection";
    const selection = cleanText(window.getSelection()?.toString());
    if (selectionOnly && !selection) {
      throw new Error("Select text on the page before using selection mode.");
    }

    const sources = markSourceBlocks();
    const notes = [];
    let blocks;
    let metadata = {};

    if (selectionOnly) {
      blocks = collectSelection(window.getSelection().getRangeAt(0));
      notes.push("Only the user's selected text was analyzed.");
    } else {
      if (typeof globalThis.Readability !== "function") {
        throw new Error("The article parser is unavailable. Reload the extension and try again.");
      }

      const article = new globalThis.Readability(document.cloneNode(true), {
        serializer: (element) => element,
      }).parse();

      if (article?.content) {
        blocks = mapParsedBlocks(article.content, sources);
        metadata = article;
      } else {
        blocks = collectSemanticFallback(sources);
        notes.push("Reader-mode extraction failed; a semantic page container was used as a fallback.");
      }
    }

    const paragraphs = finalizeParagraphs(blocks, notes);
    if (!paragraphs.length) {
      throw new Error("No article text was detected. Select the passage you want to analyze and use selection mode.");
    }

    return {
      requested_language: "match_article",
      title: cleanText(metadata.title) || cleanText(document.querySelector("h1")?.innerText)
        || cleanText(document.title) || "Untitled article",
      url: pageUrlWithoutParameters(),
      byline: cleanText(metadata.byline) || getMeta([
        "[rel='author']",
        "[class*='byline' i]",
        "[class*='author' i]",
        "meta[name='author']",
      ]),
      published_at: cleanText(metadata.publishedTime) || getMeta([
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
