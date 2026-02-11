// get runtime date Or Today's Date in YYYY-MM-DD format (ISO)
export function getTodayISO() {
  return new Date().toISOString().slice(0, 10);
}

// Convert MM/DD/YYYY → YYYY-MM-DD
export function convertMMDDYYYYToISO(str) {
  const [mm, dd, yyyy] = str.split("/");
  return `${yyyy}-${mm}-${dd}`;
}

// Convert ISO → MM/DD/YYYY
export function convertISOToMMDDYYYY(iso) {
  const [yyyy, mm, dd] = iso.split("-");
  return `${mm}/${dd}/${yyyy}`;
}

// Compare two dates ignoring time
export function datesMatch(date1, date2) {
  return (
    new Date(date1).toISOString().slice(0, 10) === new Date(date2).toISOString().slice(0, 10)
  );
}