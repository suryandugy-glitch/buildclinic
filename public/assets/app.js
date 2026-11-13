"use strict";

const { analyzeLog, sampleLogs, MAX_LENGTH } = window.BuildClinic;
const form = document.querySelector("#log-form");
const log = document.querySelector("#build-log");
const fileInput = document.querySelector("#log-file");
const count = document.querySelector("#log-count");
const clear = document.querySelector("#clear-log");
const feedback = document.querySelector("#input-feedback");
const resultTitle = document.querySelector("#result-title");
const status = document.querySelector("#result-status");
const emptyResult = document.querySelector("#result-empty");
const resultContent = document.querySelector("#result-content");

let inputVersion = 0;
let hasDiagnosis = false;

if (/Mac|iPhone|iPad/i.test(navigator.userAgent)) {
  document.querySelector("#shortcut-key").textContent = "⌘";
}

function announceInput(message = "") {
  feedback.textContent = message;
  feedback.hidden = !message;
}

function updateStatus(state, message) {
  status.dataset.state = state;
  status.lastChild.textContent = " " + message;
}

function resetDiagnosis() {
  if (!hasDiagnosis) return;
  hasDiagnosis = false;
  resultContent.replaceChildren();
  resultContent.hidden = true;
  emptyResult.hidden = false;
  updateStatus("ready", "Ready");
}

function inputChanged() {
  inputVersion += 1;
  const length = log.value.length;
  count.textContent = length.toLocaleString() + (length === 1 ? " character" : " characters");
  clear.disabled = length === 0;
  announceInput();
  resetDiagnosis();
}

function setLog(value) {
  log.value = value;
  inputChanged();
}

function element(tag, value, className) {
  const node = document.createElement(tag);
  if (value !== undefined) node.textContent = value;
  if (className) node.className = className;
  return node;
}

function evidenceBlock(evidence, label) {
  const quote = element("blockquote", undefined, "evidence");
  const heading = element("div", undefined, "evidence-heading");
  const jump = element("button", "Show in log", "line-button");
  jump.type = "button";
  jump.setAttribute("aria-label", "Show line " + evidence.line + " in log");
  jump.addEventListener("click", () => {
    const lines = log.value.split("\n");
    const start = lines.slice(0, evidence.line - 1).join("\n").length + (evidence.line > 1 ? 1 : 0);
    log.focus();
    log.setSelectionRange(start, start + lines[evidence.line - 1].length);
    const lineHeight = Number.parseFloat(getComputedStyle(log).lineHeight);
    log.scrollTop = Math.max(0, (evidence.line - 1) * lineHeight - log.clientHeight / 2);
  });
  heading.append(element("small", label), jump);
  quote.append(heading, element("code", evidence.text));
  return quote;
}

function renderFinding(finding, matched, copyText, includeHeading = true) {
  const parts = [];
  if (includeHeading) parts.push(element("h4", finding.title));
  parts.push(element("p", finding.explanation));
  copyText.push(finding.title, finding.explanation);

  if (finding.evidence) {
    const label = (matched ? "Matched line " : "Possible error line ") + finding.evidence.line;
    parts.push(evidenceBlock(finding.evidence, label));
    copyText.push(label + " — " + finding.evidence.text);
  }
  for (const related of finding.related ?? []) {
    const label = "Related line " + related.line;
    parts.push(evidenceBlock(related, label));
    copyText.push(label + " — " + related.text);
  }

  const steps = element("ol", undefined, "fix-steps");
  finding.steps.forEach(({ title, text, code }, index) => {
    const item = element("li");
    item.append(element("strong", title), element("p", text));
    if (code) {
      const snippet = element("pre", undefined, "command-example");
      snippet.append(element("code", code));
      item.append(snippet);
    }
    steps.append(item);
    copyText.push((index + 1) + ". " + title + "\n" + text + (code ? "\n" + code : ""));
  });
  parts.push(element("h5", "Steps to try"), steps, element("h5", "How to verify"), element("p", finding.verify));
  copyText.push("How to verify\n" + finding.verify);
  return parts;
}

function showDiagnosis(result) {
  hasDiagnosis = true;
  const matched = result.state === "matched";
  const copyText = [];
  const parts = renderFinding(result, matched, copyText);

  for (const finding of result.additional ?? []) {
    const details = element("details", undefined, "additional-finding");
    const summary = element("summary", finding.title + " · Line " + finding.evidence.line);
    const body = element("div", undefined, "additional-content");
    body.append(...renderFinding(finding, true, copyText, false));
    details.append(summary, body);
    parts.push(details);
  }
  if (result.omitted) {
    const message = "Showing the first 5 matches. Check a smaller section of the log to see later matches.";
    parts.push(element("p", message));
    copyText.push(message);
  }

  if (navigator.clipboard?.writeText) {
    const copy = element("button", "Copy diagnosis", "copy-button");
    copy.type = "button";
    const copyStatus = element("span", "", "copy-status");
    copyStatus.setAttribute("role", "status");
    copy.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(copyText.join("\n\n"));
        copyStatus.textContent = "Copied";
      } catch {
        copyStatus.textContent = "Select the diagnosis text to copy it.";
      }
    });
    parts.push(copy, copyStatus);
  }

  resultContent.replaceChildren(...parts);
  emptyResult.hidden = true;
  resultContent.hidden = false;
  const total = matched ? 1 + result.additional.length + result.omitted : 0;
  updateStatus(result.state, total > 1 ? total + " matches" : matched ? "Match found" : "No match");
  resultTitle.focus();
}

function checkLog() {
  const result = analyzeLog(log.value);
  if (result.state === "empty" || result.state === "too-long") {
    announceInput(result.state === "empty" ? "Paste a build log or choose a sample first." : "Use a log of 250,000 characters or fewer.");
    log.focus();
    return;
  }
  announceInput();
  showDiagnosis(result);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  checkLog();
});

form.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === "Enter" && event.target === log) {
    event.preventDefault();
    checkLog();
  }
});

log.addEventListener("input", inputChanged);
log.addEventListener("paste", (event) => {
  const pasted = event.clipboardData?.getData("text/plain").replace(/\r\n?/g, "\n");
  const available = MAX_LENGTH - log.value.length + log.selectionEnd - log.selectionStart;
  if (pasted && pasted.length > available) {
    event.preventDefault();
    announceInput("That paste exceeds the 250,000-character limit. Copy a smaller section around the failure.");
  }
});

clear.addEventListener("click", () => {
  setLog("");
  log.focus();
});

for (const button of document.querySelectorAll("[data-sample]")) {
  button.addEventListener("click", () => {
    setLog(sampleLogs[button.dataset.sample]);
    checkLog();
  });
}

fileInput.addEventListener("change", async () => {
  const [file] = fileInput.files;
  fileInput.value = "";
  if (!file) return;

  const version = ++inputVersion;
  if (file.size > MAX_LENGTH * 4) {
    announceInput("This file is too large. Open a smaller text log around the failure.");
    return;
  }

  try {
    const value = await file.text();
    if (version !== inputVersion) return;
    if (value.includes("\0")) {
      announceInput("Choose a plain text or .log file saved as UTF-8.");
      return;
    }
    if (value.length > MAX_LENGTH) {
      announceInput("This log exceeds 250,000 characters. Open a shorter excerpt.");
      return;
    }
    setLog(value);
    log.focus();
  } catch {
    if (version === inputVersion) announceInput("This file could not be opened. Paste the log directly instead.");
  }
});

inputChanged();
