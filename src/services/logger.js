import { createLogger, format, transports } from 'winston';
import { grey, green, cyan, blue, magenta, yellow, red } from 'colors';
const { colorize, combine, timestamp, label, printf, splat } = format;

export const AVAILABLE_COLORS = {
  GREY: grey,
  GREEN: green,
  CYAN: cyan,
  BLUE: blue,
  MAGENTA: magenta,
  YELLOW: yellow,
  RED: red
};

const logFormat = color => printf(
  info => `${grey(info.timestamp)} ${color(`[${info.label}|${info.level}]`)}: ${info.message}`
);

export const getLogger = (loggerLabel, loggerColor = AVAILABLE_COLORS.GREEN) => {
  return createLogger({
    format: combine(
      colorize(),
      splat(),
      label({ label: loggerLabel }),
      timestamp(),
      logFormat(loggerColor)
    ),
    stderrLevels: ['error'],
    transports: [new transports.Console()]
  });
};
