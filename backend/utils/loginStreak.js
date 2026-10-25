const isValidDateKey = (dateKey) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey || "")) return false;

  const parsedDate = new Date(`${dateKey}T00:00:00.000Z`);
  return !Number.isNaN(parsedDate.getTime()) &&
    parsedDate.toISOString().slice(0, 10) === dateKey;
};

const recordLoginStreak = (settings = {}, dateKey) => {
  const today = isValidDateKey(dateKey)
    ? dateKey
    : new Date().toISOString().slice(0, 10);
  const lastLoginDate = settings.lastLoginDate;
  const currentStreak = Math.max(0, Number(settings.loginStreak) || 0);

  if (!isValidDateKey(lastLoginDate)) {
    return { ...settings, lastLoginDate: today, loginStreak: 1 };
  }

  const daysSinceLastLogin = Math.round(
    (Date.parse(`${today}T00:00:00.000Z`) -
      Date.parse(`${lastLoginDate}T00:00:00.000Z`)) /
      86400000,
  );

  if (daysSinceLastLogin < 0) {
    return { ...settings, loginStreak: Math.max(currentStreak, 1) };
  }

  if (daysSinceLastLogin === 0) {
    return { ...settings, loginStreak: Math.max(currentStreak, 1) };
  }

  return {
    ...settings,
    lastLoginDate: today,
    loginStreak: daysSinceLastLogin === 1 ? currentStreak + 1 : 1,
  };
};

module.exports = { isValidDateKey, recordLoginStreak };
