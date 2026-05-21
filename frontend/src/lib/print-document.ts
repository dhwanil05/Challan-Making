const DEFAULT_APP_TITLE = 'U VITA ERP | Textile Challan & Invoice Management';

/** Turn doc number into a safe save/print filename (e.g. KF/26-0005 → KF-26-0005). */
export function printFilenameFromDocNumber(docNumber: string): string {
  return docNumber.trim().replace(/\//g, '-');
}

/** Set tab title while viewing a document so Print → Save as PDF uses the doc number. Returns restore fn. */
export function applyPrintDocumentTitle(docNumber: string | undefined): (() => void) | void {
  if (typeof document === 'undefined' || !docNumber) return;

  const filename = printFilenameFromDocNumber(docNumber);
  const previous = document.title;
  document.title = filename;

  return () => {
    document.title = previous || DEFAULT_APP_TITLE;
  };
}

/** Open print dialog with the suggested PDF filename = document number. */
export function printWithFilename(docNumber: string): void {
  const filename = printFilenameFromDocNumber(docNumber);
  const previous = document.title;
  document.title = filename;

  const restore = () => {
    document.title = previous;
    window.removeEventListener('afterprint', restore);
  };
  window.addEventListener('afterprint', restore);
  window.print();
}
