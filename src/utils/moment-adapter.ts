import dayjs from 'dayjs';
import advancedFormat from 'dayjs/plugin/advancedFormat';
import utc from 'dayjs/plugin/utc';
import quarters from 'dayjs/plugin/quarterOfYear';
import relativeTime from 'dayjs/plugin/relativeTime';
import timezone from 'dayjs/plugin/timezone';
import duration from 'dayjs/plugin/duration';

dayjs.extend(advancedFormat);
dayjs.extend(utc); // Use UTC plugin
dayjs.extend(quarters);
dayjs.extend(advancedFormat);
dayjs.extend(relativeTime);
dayjs.extend(timezone);
dayjs.extend(duration);

const moment = dayjs;
export default moment;
