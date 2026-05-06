import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(utc)
dayjs.extend(timezone)

export const DEFAULT_FOLLOW_UP_TIME_ZONE = 'America/New_York'

export const FOLLOW_UP_TIME_ZONES = [
  { value: 'America/New_York', label: 'Eastern Time' },
  { value: 'America/Chicago', label: 'Central Time' },
  { value: 'America/Denver', label: 'Mountain Time' },
  { value: 'America/Los_Angeles', label: 'Pacific Time' },
] as const

export const getFollowUpTimeZoneLabel = (timeZone = DEFAULT_FOLLOW_UP_TIME_ZONE) =>
  FOLLOW_UP_TIME_ZONES.find((item) => item.value === timeZone)?.label || timeZone

export const followUpInputToUtc = (value: string, timeZone = DEFAULT_FOLLOW_UP_TIME_ZONE) =>
  dayjs.tz(value, timeZone).utc().format()

export const utcToFollowUpInput = (value: string, timeZone = DEFAULT_FOLLOW_UP_TIME_ZONE) =>
  dayjs.utc(value).tz(timeZone).format('YYYY-MM-DDTHH:mm')

export const formatFollowUpTime = (
  value: string,
  format = 'MMM D, YYYY [at] h:mm A',
  timeZone = DEFAULT_FOLLOW_UP_TIME_ZONE
) => dayjs.utc(value).tz(timeZone).format(format)

export const nowFollowUpInput = (timeZone = DEFAULT_FOLLOW_UP_TIME_ZONE) =>
  dayjs().tz(timeZone).format('YYYY-MM-DDTHH:mm')

export const isFutureFollowUpInput = (value: string, timeZone = DEFAULT_FOLLOW_UP_TIME_ZONE) =>
  dayjs.tz(value, timeZone).isAfter(dayjs())
