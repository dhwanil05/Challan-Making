/** Indian numbering — rupees only (paise rounded). */
export function amountInWords(amount: number): string {
  const n = Math.round(Math.abs(amount));
  if (n === 0) return 'Zero Rupees Only';

  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const two = (num: number): string => {
    if (num < 10) return ones[num];
    if (num < 20) return teens[num - 10];
    return `${tens[Math.floor(num / 10)]}${ones[num % 10] ? ' ' + ones[num % 10] : ''}`.trim();
  };

  const three = (num: number): string => {
    if (num < 100) return two(num);
    return `${ones[Math.floor(num / 100)]} Hundred${num % 100 ? ' ' + two(num % 100) : ''}`.trim();
  };

  const parts: string[] = [];
  let rem = n;

  const crore = Math.floor(rem / 10000000);
  if (crore) {
    parts.push(`${three(crore)} Crore`);
    rem %= 10000000;
  }
  const lakh = Math.floor(rem / 100000);
  if (lakh) {
    parts.push(`${three(lakh)} Lakh`);
    rem %= 100000;
  }
  const thousand = Math.floor(rem / 1000);
  if (thousand) {
    parts.push(`${three(thousand)} Thousand`);
    rem %= 1000;
  }
  if (rem) parts.push(three(rem));

  return `${parts.join(' ')} Rupees Only`;
}
