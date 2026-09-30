export function dateToStr(d) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .split("T")[0];
}

export function todayStr() {
  return dateToStr(new Date());
}

export function monthStr() {
  return todayStr().slice(0, 7);
}
