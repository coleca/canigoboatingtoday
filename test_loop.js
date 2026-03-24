const today = new Date();
today.setHours(0, 0, 0, 0);

const dateStr = '2023-10-10';
const date = new Date(dateStr + 'T00:00');

console.log(today, date);
