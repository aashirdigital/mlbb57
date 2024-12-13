const getCurrentDateRange = () => {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;
  let startDate, endDate;
  const currentDay = today.getDate();

  if (currentDay >= 1 && currentDay <= 7) {
    startDate = `${currentYear}-${currentMonth}-01`;
    endDate = `${currentYear}-${currentMonth}-07`;
  } else if (currentDay >= 8 && currentDay <= 14) {
    startDate = `${currentYear}-${currentMonth}-08`;
    endDate = `${currentYear}-${currentMonth}-14`;
  } else if (currentDay >= 15 && currentDay <= 21) {
    startDate = `${currentYear}-${currentMonth}-15`;
    endDate = `${currentYear}-${currentMonth}-21`;
  } else {
    const lastDayOfMonth = new Date(currentYear, currentMonth, 0).getDate();
    startDate = `${currentYear}-${currentMonth}-22`;
    endDate = `${currentYear}-${currentMonth}-${lastDayOfMonth}`;
  }
  return { startDate, endDate };
};

module.exports = { getCurrentDateRange };
