function appendToTaskBody(
  currentBody: string,
  appendedText: string,
  separator: string,
) {
  const trimmedAppendedText = appendedText.trim();
  const baseMarkdown = currentBody.trimEnd();

  if (!trimmedAppendedText) {
    return baseMarkdown;
  }
  if (!baseMarkdown) {
    return trimmedAppendedText;
  }
  return `${baseMarkdown}${separator}${trimmedAppendedText}`;
}

export function appendPlainTextToTaskBody(
  currentBody: string,
  appendedText: string,
) {
  return appendToTaskBody(currentBody, appendedText, "\n\n");
}

export function hasRichTextContent(content: string) {
  return content.trim().length > 0;
}
