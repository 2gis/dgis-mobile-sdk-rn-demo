import { LogLevel, LogOptions, type LogSink } from '@2gis/dgis-mobile-sdk-map';

import { isBoolean, isObjectRecord } from './utils';

export interface LogOptionsSettings {
  systemLevel: LogLevel;
  customLevel: LogLevel;
  useCustom: boolean;
}

export const defaultLogOptionsSettings: LogOptionsSettings = {
  systemLevel: LogLevel.Warning,
  customLevel: LogLevel.Warning,
  useCustom: false,
};

const maxPendingCustomLogMessages = 200;
const maxCustomLogMessagesPerFlush = 50;
const maxCustomLogMessageLength = 4000;

let pendingCustomLogMessages: string[] = [];
let droppedCustomLogMessages = 0;
let customLogFlushTimer: ReturnType<typeof setTimeout> | null = null;

function formatCustomLogMessage(message: Parameters<LogSink['write']>[0]) {
  const location = message.file ? ` (${message.file}:${message.line})` : '';
  const text =
    message.text.length > maxCustomLogMessageLength
      ? message.text.slice(0, maxCustomLogMessageLength) + '...'
      : message.text;

  return `[CustomLogger][${LogLevel[message.level]}] ${text}${location}`;
}

function flushCustomLogMessages() {
  customLogFlushTimer = null;

  const messages = pendingCustomLogMessages.splice(
    0,
    maxCustomLogMessagesPerFlush,
  );
  if (messages.length === 0 && droppedCustomLogMessages === 0) {
    return;
  }

  if (droppedCustomLogMessages > 0) {
    messages.unshift(
      `[CustomLogger] Dropped ${droppedCustomLogMessages} log messages`,
    );
    droppedCustomLogMessages = 0;
  }

  console.log(messages.join('\n'));

  if (pendingCustomLogMessages.length > 0) {
    scheduleCustomLogFlush();
  }
}

function scheduleCustomLogFlush() {
  if (customLogFlushTimer !== null) {
    return;
  }

  customLogFlushTimer = setTimeout(flushCustomLogMessages, 0);
}

const customLogSink: LogSink = {
  write(message) {
    if (pendingCustomLogMessages.length >= maxPendingCustomLogMessages) {
      droppedCustomLogMessages += 1;
      scheduleCustomLogFlush();
      return;
    }

    pendingCustomLogMessages.push(formatCustomLogMessage(message));
    scheduleCustomLogFlush();
  },
};

export const sdkLogLevels = [
  { value: LogLevel.Verbose, label: 'Verbose' },
  { value: LogLevel.Info, label: 'Info' },
  { value: LogLevel.Warning, label: 'Warning' },
  { value: LogLevel.Error, label: 'Error' },
  { value: LogLevel.Fatal, label: 'Fatal' },
  { value: LogLevel.Off, label: 'Off' },
] as const;

const logLevelValues = sdkLogLevels.map(level => level.value);

export function readStoredLogOptionsSettings(
  source: unknown,
): LogOptionsSettings {
  const record = isObjectRecord(source) ? source : {};

  return normalizeLogOptionsSettings({
    systemLevel: isLogLevel(record.systemLevel)
      ? record.systemLevel
      : isLogLevel(record.logSystemLevel)
      ? record.logSystemLevel
      : defaultLogOptionsSettings.systemLevel,
    customLevel: isLogLevel(record.customLevel)
      ? record.customLevel
      : isLogLevel(record.logCustomLevel)
      ? record.logCustomLevel
      : defaultLogOptionsSettings.customLevel,
    useCustom: isBoolean(record.useCustom)
      ? record.useCustom
      : isBoolean(record.logUseCustom)
      ? record.logUseCustom
      : defaultLogOptionsSettings.useCustom,
  });
}

export function normalizeLogOptionsSettings(
  settings: LogOptionsSettings,
): LogOptionsSettings {
  return {
    systemLevel: isLogLevel(settings.systemLevel)
      ? settings.systemLevel
      : defaultLogOptionsSettings.systemLevel,
    customLevel: isLogLevel(settings.customLevel)
      ? settings.customLevel
      : defaultLogOptionsSettings.customLevel,
    useCustom: isBoolean(settings.useCustom)
      ? settings.useCustom
      : defaultLogOptionsSettings.useCustom,
  };
}

export function createLogOptionsFromSettings(
  settings: LogOptionsSettings,
): LogOptions {
  const normalized = normalizeLogOptionsSettings(settings);

  return new LogOptions({
    systemLevel: normalized.systemLevel,
    customLevel: normalized.customLevel,
    customSink: normalized.useCustom ? customLogSink : null,
  });
}

function isLogLevel(value: unknown): value is LogLevel {
  return (
    typeof value === 'number' && logLevelValues.includes(value as LogLevel)
  );
}
