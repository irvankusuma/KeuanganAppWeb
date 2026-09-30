export const formatCurrency = (n) =>
  "Rp " + (Number(n) || 0).toLocaleString("id-ID");

export const getMonthYear = (d) => {
  if (!d) return "";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "";
  return `${date.getMonth() + 1}-${date.getFullYear()}`;
};
