const bunyan = require('bunyan')
const createCWStream = require('bunyan-cloudwatch')
const NODE_ENV = process.env.NODE_ENV || 'unknown'


function getLogStreams(name, env) {
  const stdoutStream = {
    stream: process.stdout,
    level: 'info',
  }
  if (env === 'development') {
    return [stdoutStream]
  }

  const cloudwatchStream = {
    stream: createCWStream({
      logGroupName: `k2-${env}`,
      logStreamName: `${name}-${env}`,
      cloudWatchLogsOptions: {
        region: 'us-east-1',
      },
    }),
    type: 'raw',
  }
  return [stdoutStream, cloudwatchStream]
}

function createLogger(name, env = NODE_ENV) {
  const childLogs = new Map()
  const logger = bunyan.createLogger({
    name,
    serializers: bunyan.stdSerializers,
    streams: getLogStreams(name, env),
  })

  return Object.assign(logger, {
    forAccount(account = {}) {
      if (!childLogs.has(account.id)) {
        const childLog = logger.child({
          account_id: account.id,
          account_email: account.emailAddress,
        })
        childLogs.set(account.id, childLog)
      }
      return childLogs.get(account.id)
    },
  })
}

module.exports = {
  createLogger,
}
